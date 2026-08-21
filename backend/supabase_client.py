import os
from supabase import create_client, Client

_client: Client | None = None


def get_supabase() -> Client:
    """
    Returns a singleton Supabase client using the SERVICE ROLE key.
    Use only in trusted backend code — this bypasses Row Level Security,
    which is required here since the job processor writes on behalf of
    users without their session token.
    """
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        service_key = os.environ["SUPABASE_SERVICE_KEY"]
        _client = create_client(url, service_key)
    return _client