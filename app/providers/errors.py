class ProviderUnavailableError(RuntimeError):
    """A provider failed after bounded retries and can be retried by the client."""
