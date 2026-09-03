class ComfyError(RuntimeError):
    """Base exception for ComfyUI integration failures."""


class ComfyProtocolError(ComfyError):
    """ComfyUI returned an invalid or rejected response."""


class ComfyExecutionError(ComfyError):
    """A queued ComfyUI workflow failed during execution."""


class ComfyTimeoutError(ComfyError):
    """A ComfyUI workflow did not finish before the configured deadline."""


class WorkflowConfigurationError(ValueError):
    """A workflow/profile pair cannot satisfy its declared bindings."""
