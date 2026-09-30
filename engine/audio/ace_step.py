"""Local ACE-Step 1.5 music generation; no implicit model downloads."""

from __future__ import annotations

import json
import time
from collections.abc import Callable
from pathlib import Path
from urllib.parse import urlsplit

import httpx


class AceStepError(RuntimeError):
    pass


class AceStepClient:
    """Small client for ACE-Step's local asynchronous REST API."""

    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8001",
        *,
        client: httpx.Client | None = None,
        sleep: Callable[[float], None] = time.sleep,
        timeout_seconds: float = 600,
    ) -> None:
        parsed = urlsplit(base_url)
        if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
            raise ValueError("ACE-Step doit être un service HTTP local")
        self.base_url = base_url.rstrip("/")
        self.client = client or httpx.Client(base_url=self.base_url, timeout=30)
        self._owns_client = client is None
        self.sleep = sleep
        self.timeout_seconds = timeout_seconds

    def __enter__(self) -> AceStepClient:
        return self

    def __exit__(self, *_exc: object) -> None:
        if self._owns_client:
            self.client.close()

    def generate(
        self,
        *,
        prompt: str,
        duration: float,
        destination: Path,
        seed: int,
    ) -> str:
        if not prompt.strip():
            raise ValueError("La description musicale est vide")
        if not 10 <= duration <= 600:
            raise ValueError("ACE-Step accepte une durée de 10 à 600 secondes")
        try:
            response = self.client.post(
                "/release_task",
                json={
                    "prompt": prompt.strip(),
                    "lyrics": "[Instrumental]",
                    "audio_duration": duration,
                    "audio_format": "wav",
                    "model": "acestep-v15-turbo",
                    "thinking": False,
                    "use_cot_caption": False,
                    "use_cot_language": False,
                    "batch_size": 1,
                    "inference_steps": 8,
                    "use_random_seed": False,
                    "seed": seed,
                },
            )
            task = self._data(response)
            if not isinstance(task, dict) or not isinstance(task.get("task_id"), str):
                raise AceStepError("ACE-Step n'a pas renvoyé d'identifiant de tâche")
            task_id: str = task["task_id"]
            deadline = time.monotonic() + self.timeout_seconds
            while time.monotonic() < deadline:
                status = self._data(
                    self.client.post("/query_result", json={"task_id_list": [task_id]})
                )
                if not isinstance(status, list) or not status:
                    raise AceStepError("Réponse de suivi ACE-Step invalide")
                item = status[0]
                if not isinstance(item, dict) or item.get("task_id") != task_id:
                    raise AceStepError("ACE-Step a renvoyé une autre tâche")
                if item.get("status") == 2:
                    detail = item.get("error") or item.get("result")
                    raise AceStepError(f"Génération ACE-Step échouée : {detail}")
                if item.get("status") == 1:
                    path = self._result_path(item.get("result"))
                    audio = self.client.get(path)
                    audio.raise_for_status()
                    if not audio.content.startswith(b"RIFF") or b"WAVE" not in audio.content[:16]:
                        raise AceStepError("ACE-Step n'a pas renvoyé un fichier WAV")
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    temporary = destination.with_suffix(".wav.partial")
                    temporary.write_bytes(audio.content)
                    temporary.replace(destination)
                    return task_id
                self.sleep(2)
            raise AceStepError(f"ACE-Step n'a pas terminé en {self.timeout_seconds:g} s")
        except httpx.HTTPError as exc:
            raise AceStepError(f"Service ACE-Step indisponible : {exc}") from exc

    @staticmethod
    def _data(response: httpx.Response) -> object:
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict) or payload.get("code") != 200:
            raise AceStepError(f"Réponse ACE-Step en erreur : {payload}")
        return payload.get("data")

    @staticmethod
    def _result_path(raw: object) -> str:
        results = json.loads(raw) if isinstance(raw, str) else raw
        if not isinstance(results, list) or not results or not isinstance(results[0], dict):
            raise AceStepError("Résultat ACE-Step sans piste audio")
        path = results[0].get("file")
        if not isinstance(path, str):
            raise AceStepError("Résultat ACE-Step sans URL audio")
        parsed = urlsplit(path)
        if parsed.scheme or parsed.netloc or parsed.path != "/v1/audio" or not parsed.query:
            raise AceStepError("URL audio ACE-Step non locale ou invalide")
        return path
