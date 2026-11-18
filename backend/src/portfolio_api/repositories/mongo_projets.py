"""Projets, filtres et agrégation R3 : MongoDB uniquement."""

from portfolio_api.db.mongo import get_mongo_db


async def create_indexes() -> None:
    collection = get_mongo_db().projets
    await collection.create_index("projet_slug", unique=True)

    for field in ("candidat_slugs", "competence_slugs", "domaine_slugs"):
        await collection.create_index(field)


async def find_projet(slug: str) -> dict | None:
    return await get_mongo_db().projets.find_one(
        {"projet_slug": slug},
        {"_id": 0},
    )


async def list_projets(
    candidat_slug: str,
    competence: str | None,
    domaine_slug: str | None,
    page: int,
    limit: int,
) -> tuple[list[dict], int]:
    query: dict = {"candidat_slugs": candidat_slug}

    if competence is not None:
        query["competence_slugs"] = competence

    if domaine_slug is not None:
        query["domaine_slugs"] = domaine_slug

    collection = get_mongo_db().projets
    total = await collection.count_documents(query)

    cursor = collection.find(query, {"_id": 0}).sort("projet_slug", 1)
    projets = await cursor.skip((page - 1) * limit).limit(limit).to_list(
        length=limit
    )

    return projets, total


async def aggregate_stats(candidat_slug: str) -> dict:
    pipeline = [
        {"$match": {"candidat_slugs": candidat_slug}},
        {
            "$facet": {
                "total": [{"$count": "nombre"}],
                "statistiques": [
                    {
                        "$project": {
                            "competence_slugs": {
                                "$setUnion": ["$competence_slugs", []]
                            }
                        }
                    },
                    {"$unwind": "$competence_slugs"},
                    {
                        "$group": {
                            "_id": "$competence_slugs",
                            "nombre_projets": {"$sum": 1},
                        }
                    },
                    {"$sort": {"nombre_projets": -1, "_id": 1}},
                    {
                        "$project": {
                            "_id": 0,
                            "competence_slug": "$_id",
                            "nombre_projets": 1,
                        }
                    },
                ],
            }
        },
    ]

    cursor = await get_mongo_db().projets.aggregate(pipeline)
    rows = await cursor.to_list(length=1)

    result = rows[0] if rows else {"total": [], "statistiques": []}

    return {
        "total_projets": (
            result["total"][0]["nombre"] if result["total"] else 0
        ),
        "statistiques": result["statistiques"],
    }


async def upsert_projet(document: dict) -> None:
    await get_mongo_db().projets.replace_one(
        {"projet_slug": document["projet_slug"]},
        document,
        upsert=True,
    )


async def delete_projet(slug: str) -> None:
    await get_mongo_db().projets.delete_one(
        {"projet_slug": slug}
    )