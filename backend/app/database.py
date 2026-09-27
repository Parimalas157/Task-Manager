from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings


class Database:
    client: AsyncIOMotorClient = None
    db = None


database = Database()


async def connect_to_mongo():
    database.client = AsyncIOMotorClient(settings.mongo_uri)
    database.db = database.client[settings.database_name]

    # Indexes for performance and uniqueness
    await database.db.users.create_index("email", unique=True)
    await database.db.projects.create_index("owner_id")
    await database.db.projects.create_index("members")
    await database.db.tasks.create_index("project_id")
    await database.db.tasks.create_index([("project_id", 1), ("status", 1)])
    await database.db.tasks.create_index("assignee_id")


async def close_mongo_connection():
    if database.client:
        database.client.close()


def get_db():
    return database.db
