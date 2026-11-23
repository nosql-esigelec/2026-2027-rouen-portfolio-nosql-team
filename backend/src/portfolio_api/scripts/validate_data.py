"""Vérifie les fichiers de données sans démarrer MongoDB ni Neo4j.

    cd backend && uv run python -m portfolio_api.scripts.validate_data
"""

from __future__ import annotations

from collections import Counter

from pydantic import ValidationError

from portfolio_api.models import CandidatOut, ProjetOut
from portfolio_api.scripts.seed import load_member_files


def validate() -> list[str]:
    """Retourne les erreurs de validation (liste vide si les données sont valides)."""
    errors: list[str] = []
    candidats = load_member_files("candidats")
    projets = load_member_files("projets")

    for name, docs, key, model in (
        ("candidats", candidats, "candidat_slug", CandidatOut),
        ("projets", projets, "projet_slug", ProjetOut),
    ):
        ids = [doc.get(key) for doc in docs if isinstance(doc, dict)]
        for value, count in Counter(ids).items():
            if count > 1:
                errors.append(f"{name} : identifiant en double : {value!r}")
        for index, doc in enumerate(docs, start=1):
            try:
                model.model_validate(doc)
            except (ValidationError, TypeError, ValueError) as exc:
                errors.append(f"{name}[{index}] : {exc}")

    known_candidats = {
        doc.get("candidat_slug") for doc in candidats if isinstance(doc, dict)
    }
    for projet in projets:
        if not isinstance(projet, dict):
            continue
        for author in projet.get("candidat_slugs", []):
            if author not in known_candidats:
                errors.append(
                    f"projet {projet.get('projet_slug')!r} : auteur inconnu {author!r}"
                )

    print(f"[validation] {len(candidats)} candidat(s), {len(projets)} projet(s)")
    return errors


def main() -> None:
    errors = validate()
    if errors:
        for message in errors:
            print("[ERREUR]", message)
        raise SystemExit(1)
    print("[validation] OK — documents valides, slugs uniques et auteurs présents")


if __name__ == "__main__":
    main()
