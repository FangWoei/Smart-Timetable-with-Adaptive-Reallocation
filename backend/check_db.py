import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])

rows = sb.table("timeslots").select("*").execute().data
print(len(rows), "timeslots found")
print(rows[0])