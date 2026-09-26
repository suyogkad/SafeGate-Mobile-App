"""Seed the database with one admin, one therapist, one parent, and one child.

Run with: python -m scripts.seed
"""
import asyncio

from passlib.context import CryptContext

from app.db.models import Child, TherapistProfile, User, UserRole
from app.db.session import AsyncSessionLocal

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SEED_PASSWORD = "ChangeMe123!"


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        hashed = pwd_context.hash(SEED_PASSWORD)

        admin = User(
            email="admin@example.com",
            hashed_password=hashed,
            role=UserRole.ADMIN,
            full_name="Admin User",
        )
        therapist = User(
            email="therapist@example.com",
            hashed_password=hashed,
            role=UserRole.THERAPIST,
            full_name="Dr. Jamie Therapist",
        )
        parent = User(
            email="parent@example.com",
            hashed_password=hashed,
            role=UserRole.PARENT,
            full_name="Parent Example",
        )
        session.add_all([admin, therapist, parent])
        await session.flush()

        session.add(TherapistProfile(user_id=therapist.id, bio="Seed therapist profile."))

        child = Child(
            parent_id=parent.id,
            therapist_id=therapist.id,
            full_name="Sample Child",
            emergency_contact_name="Emergency Contact",
            emergency_contact_phone="+61 400 000 000",
            home_address="1 Example Street, Sydney NSW, Australia",
        )
        session.add(child)

        await session.commit()
        print("Seeded: admin@example.com, therapist@example.com, parent@example.com")
        print(f"Password for all seed users: {SEED_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(seed())
