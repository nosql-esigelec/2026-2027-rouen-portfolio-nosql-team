"""Profils et expériences : MongoDB uniquement."""

from portfolio_api.db.mongo import get_mongo_db


async def create_indexes() -> None:
    await get_mongo_db().candidats.create_index("slug", unique=True)


async def find_candidat(slug: str) -> dict | None:
    return await get_mongo_db().candidats.find_one({"slug": slug}, {"_id": 0})


async def competence_names(slugs: list[str]) -> dict[str, str]:
    names = {}
    cursor = get_mongo_db().candidats.find(
        {"competences.slug": {"$in": slugs}}, {"_id": 0, "competences": 1}
    )
    async for candidat in cursor:
        for competence in candidat.get("competences", []):
            if competence["slug"] in slugs:
                names[competence["slug"]] = competence["nom"]
    return names


async def upsert_candidat(document: dict) -> None:
    await get_mongo_db().candidats.replace_one(
        {"slug": document["slug"]}, document, upsert=True
    )