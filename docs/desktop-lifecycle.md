# Cycle de vie desktop Windows

La fenêtre, le serveur local et les moteurs sont trois cycles de vie distincts.
Fermer la fenêtre principale peut donc la cacher dans la zone de notification
sans arrêter FastAPI, la file de production ni les moteurs supervisés.

## Fermeture

Le réglage global est enregistré dans
`%LOCALAPPDATA%\SerreStudio\.studio\desktop-lifecycle.json` pour l'EXE, ou dans
le `--data-dir` choisi en développement.

- `ask` ouvre le dialogue Réduire / Quitter, avec mémorisation facultative ;
- `background` cache la fenêtre et garde le Studio actif ;
- `quit` ferme réellement le Studio et arrête ses processus gérés.

Si pystray ou Pillow ne peut pas être chargé, le mode arrière-plan est désactivé
et le dialogue ne propose que la fermeture complète. Cette dégradation est
écrite dans `logs\desktop.log`; elle ne peut pas laisser un processus invisible.

## Ownership des moteurs

Le menu tray double la sécurité du `LocalServiceSupervisor` : il n'affiche
Arrêter que pour un processus `managed`, puis l'API refuse encore tout arrêt
d'une instance externe. Une fermeture complète appelle `supervisor.stop()` :
seuls les handles possédés sont terminés. Cacher la fenêtre n'appelle aucun
arrêt, donc les jobs et runtimes continuent normalement.

## Voyant et menu

`GET /api/desktop/status` agrège sans mutation les runtimes, la file persistante,
les jobs directs et les notifications récentes. Les priorités sont :

1. `ERROR` si un runtime ou une tâche est en erreur ;
2. `WORKING` si une production est active ou en attente ;
3. `READY` si tous les moteurs sont prêts ;
4. `DEGRADED` si une partie seulement est disponible ;
5. `IDLE` si aucun moteur n'est actif.

Le tooltip résume Ollama, ComfyUI et le nombre de jobs. Le menu permet d'ouvrir
le Studio, démarrer les moteurs configurés, arrêter les moteurs gérés, ouvrir la
file, le Journal ou les réglages, activer les notifications et quitter.

Les notifications Windows reprennent les événements persistants de niveau
`success` et `error`. Le premier poll établit une baseline afin de ne pas
réafficher tout l'historique à chaque démarrage.

## Packaging et validation

L'extra `desktop` contient pywebview, pystray et Pillow. Le spec PyInstaller
collecte explicitement les backends tray et les modules d'image, car ils sont
chargés tardivement pour permettre le fallback.

```powershell
python -m pip install -e ".[desktop,build,dev]"
python -m pytest tests/test_desktop_lifecycle.py tests/test_desktop_tray.py
python -m tools.build_desktop
```
