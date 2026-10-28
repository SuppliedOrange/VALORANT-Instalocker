import os
import time
import json


class Stats:
    def __init__(self):
        self.stats_dir = os.path.join(os.getenv("APPDATA"), "vry")
        self.stats_path = os.path.join(self.stats_dir, "stats.json")

    def _ensure_stats_dir(self):
        os.makedirs(self.stats_dir, exist_ok=True)

    @staticmethod
    def _normalise_history(history):
        if isinstance(history, list):
            return [item for item in history if isinstance(item, dict)]
        if isinstance(history, dict):
            return [history]
        return []

    @staticmethod
    def _map_name(map_value):
        if isinstance(map_value, dict):
            return map_value.get("name") or "Unknown"
        return map_value or "Unknown"

    @staticmethod
    def _relation_name(relation):
        if relation == "ally":
            return "teammate"
        if relation == "enemy":
            return "enemy"
        return "player"

    def _write_data(self, data):
        self._ensure_stats_dir()
        with open(self.stats_path, "w") as f:
            json.dump(data, f)

    def save_data(self, data):
        original_data = self.read_data()
        updated_data = {
            puuid: self._normalise_history(history)
            for puuid, history in original_data.items()
        }

        for puuid, entry in data.items():
            if not isinstance(entry, dict):
                continue

            history = updated_data.setdefault(puuid, [])
            match_id = entry.get("match_id")
            if match_id:
                for index, existing_entry in enumerate(history):
                    if existing_entry.get("match_id") == match_id:
                        merged_entry = existing_entry.copy()
                        for key, value in entry.items():
                            if (
                                key in ("result", "score", "winning_team")
                                and value is None
                                and merged_entry.get(key) is not None
                            ):
                                continue
                            merged_entry[key] = value
                        history[index] = merged_entry
                        break
                else:
                    history.append(entry)
            else:
                history.append(entry)

        self._write_data(updated_data)

    def read_data(self):
        try:
            with open(self.stats_path, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.decoder.JSONDecodeError):
            return {}

    def build_encounter_summary(
        self,
        stats_data,
        puuid,
        current_match_id,
        fallback_name="#",
        fallback_relation=None,
    ):
        history = self._normalise_history(stats_data.get(puuid))
        if not history:
            return None

        previous_entries = []
        seen_match_ids = set()
        for entry in reversed(history):
            match_id = entry.get("match_id")
            if match_id == current_match_id:
                continue
            dedupe_key = match_id or id(entry)
            if dedupe_key in seen_match_ids:
                continue
            seen_match_ids.add(dedupe_key)
            previous_entries.append(entry)

        if not previous_entries:
            return None

        latest = previous_entries[0]
        ally_wins = ally_losses = ally_unknown = 0
        enemy_wins = enemy_losses = enemy_unknown = 0
        for entry in previous_entries:
            result = entry.get("result")
            rel = entry.get("relation")
            if rel == "ally":
                if result == "win":
                    ally_wins += 1
                elif result == "loss":
                    ally_losses += 1
                else:
                    ally_unknown += 1
            elif rel == "enemy":
                if result == "win":
                    enemy_wins += 1
                elif result == "loss":
                    enemy_losses += 1
                else:
                    enemy_unknown += 1

        latest_epoch = latest.get("epoch", time.time())
        try:
            time_diff = time.time() - float(latest_epoch)
        except (TypeError, ValueError):
            time_diff = 0

        latest_relation = latest.get("relation") or fallback_relation
        latest_name = latest.get("name")
        if not latest_name or latest_name == "#":
            latest_name = fallback_name
        return {
            "times": len(previous_entries),
            "name": latest_name,
            "agent": latest.get("agent") or "Unknown",
            "map": self._map_name(latest.get("map")),
            "relation": latest_relation,
            "relation_name": self._relation_name(latest_relation),
            "time_diff": max(0, time_diff),
            "ally_wins": ally_wins,
            "ally_losses": ally_losses,
            "ally_unknown": ally_unknown,
            "ally_count": ally_wins + ally_losses + ally_unknown,
            "enemy_wins": enemy_wins,
            "enemy_losses": enemy_losses,
            "enemy_unknown": enemy_unknown,
            "enemy_count": enemy_wins + enemy_losses + enemy_unknown,
        }

    def format_encounter_summary(self, played):
        ally_count = played.get("ally_count", 0)
        enemy_count = played.get("enemy_count", 0)

        parts = [
            f"Already played with {played['name']} "
            f"({played['times']} times"
        ]
        if ally_count:
            parts.append(f" — {ally_count} as ally")
        if enemy_count:
            parts.append(f", {enemy_count} as enemy")
        parts.append("). ")

        parts.append(
            f"Last seen: {played['relation_name']} {played['agent']} "
            f"on {played['map']} {self.convert_time(played['time_diff'])} ago."
        )

        if ally_count:
            ally_record = f"{played['ally_wins']}W-{played['ally_losses']}L"
            if played["ally_unknown"]:
                ally_record += f" ({played['ally_unknown']} unknown)"
            parts.append(f" With: {ally_record}.")
        if enemy_count:
            enemy_record = f"{played['enemy_wins']}W-{played['enemy_losses']}L"
            if played["enemy_unknown"]:
                enemy_record += f" ({played['enemy_unknown']} unknown)"
            parts.append(f" Against: {enemy_record}.")

        return "".join(parts)

    def update_match_result(self, match_id, my_team, winning_team, score=None):
        if not match_id or not my_team or not winning_team:
            return False

        stats_data = self.read_data()
        changed = False
        my_result = "win" if my_team == winning_team else "loss"
        enemy_result = "loss" if my_team == winning_team else "win"

        for puuid, history in list(stats_data.items()):
            normalised_history = self._normalise_history(history)
            if normalised_history is not history:
                stats_data[puuid] = normalised_history

            for entry in normalised_history:
                if entry.get("match_id") != match_id:
                    continue

                result = enemy_result if entry.get("relation") == "enemy" else my_result
                updates = {
                    "result": result,
                    "winning_team": winning_team,
                    "score": score,
                }
                for key, value in updates.items():
                    if entry.get(key) != value:
                        entry[key] = value
                        changed = True

        if changed:
            self._write_data(stats_data)
        return changed

    @staticmethod
    def convert_time(s):
        s = int(s)
        if s < 60:
            return f"{s} second" if s == 1 else f"{s} seconds"
        if s < 3600:
            return f"{s // 60} minute" if s // 60 == 1 else f"{s // 60} minutes"
        if s < 86400:
            return f"{s // 3600} hours" if s // 3600 == 1 else f"{s // 3600} hours"
        return f"{s // 86400} days" if s // 86400 == 1 else f"{s // 86400} days"
