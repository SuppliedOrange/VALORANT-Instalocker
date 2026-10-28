class PlayerStats:
    def __init__(self, Requests, log, config):
        self.Requests = Requests
        self.log = log
        self.config = config
        self.match_details_cache = {}

    def clear_runtime_cache(self):
        """Clear transient runtime caches (safe to call on MENUS/new match)."""
        self.match_details_cache.clear()

    def _default_stats(self):
        return {
            "kd": "N/A",
            "hs": "N/A",
            "RankedRatingEarned": "N/A",
            "AFKPenalty": "N/A",
            "LastActiveEpoch": None,
        }

    @staticmethod
    def _to_int(value, default=0):
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    def _should_fetch_comp_stats(self):
        return any(
            self.config.get_table_flag(flag)
            for flag in ("headshot_percent", "kd", "earned_rr", "last_active")
        )

    def _get_match_details_cached(self, match_id):
        """Fetch /match-details once per match_id for this runtime session."""
        if not match_id:
            return None

        if match_id in self.match_details_cache:
            return self.match_details_cache[match_id]

        match_response = self.Requests.fetch(
            "pd",
            f"/match-details/v1/matches/{match_id}",
            "get",
        )

        if match_response.status_code == 404:
            return None

        match_data = match_response.json()
        self.match_details_cache[match_id] = match_data
        return match_data

    def get_stats(self, puuid):
        # Early exit if no competitive stats are required.
        if not self._should_fetch_comp_stats():
            return self._default_stats()

        # Fetch competitive updates
        try:
            response = self.Requests.fetch(
                "pd",
                f"/mmr/v1/players/{puuid}/competitiveupdates?startIndex=0&endIndex=1&queue=competitive",
                "get",
            )
            matches = response.json().get("Matches", [])
            if not matches:
                return self._default_stats()
        except Exception as e:
            self.log(f"Error fetching competitive updates: {e}")
            return self._default_stats()

        match_summary = matches[0]
        match_id = match_summary.get("MatchID")
        if not match_id:
            return self._default_stats()

        try:
            match_data = self._get_match_details_cached(match_id)
            if match_data is None:
                match_data = {}
        except Exception as e:
            self.log(f"Error fetching match details: {e}")
            match_data = {}

        return self._process_match_data(puuid, match_data, match_summary)

    def _process_match_data(self, puuid, match_data, match_summary):
        total_hits, total_headshots = 0, 0
        kills, deaths = None, None

        # Extract round stats
        for rround in match_data.get("roundResults", []):
            for player in rround.get("playerStats", []):
                if player.get("subject") == puuid:
                    for hits in player.get("damage", []):
                        total_hits += (
                            hits.get("legshots", 0)
                            + hits.get("bodyshots", 0)
                            + hits.get("headshots", 0)
                        )
                        total_headshots += hits.get("headshots", 0)

        # Extract overall player stats
        for player in match_data.get("players", []):
            if player.get("subject") == puuid:
                stats = player.get("stats", {})
                kills = stats.get("kills", 0)
                deaths = stats.get("deaths", 0)
                break

        # Calculate KD
        kd = "N/A" if kills is None else round(kills / deaths, 2) if deaths else kills

        ranked_rating_earned = match_summary.get("RankedRatingEarned", "N/A")
        afk_penalty = match_summary.get("AFKPenalty", "N/A")
        match_info = match_data.get("matchInfo", {}) if isinstance(match_data, dict) else {}
        last_comp_start = self._to_int(
            match_summary.get("MatchStartTime") or match_info.get("gameStartMillis"),
            None,
        )
        game_length = self._to_int(match_info.get("gameLengthMillis"), 0)
        last_active_epoch = (
            (last_comp_start + game_length) / 1000
            if last_comp_start is not None
            else None
        )

        # Compile final stats
        final_stats = {
            "kd": kd,
            "hs": round((total_headshots / total_hits) * 100) if total_hits else "N/A",
            "RankedRatingEarned": ranked_rating_earned,
            "AFKPenalty": afk_penalty,
            "LastActiveEpoch": last_active_epoch,
        }
        return final_stats


if __name__ == "__main__":
    from constants import version
    from requestsV import Requests
    from logs import Logging
    from errors import Error
    import urllib3

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    Logging = Logging()
    log = Logging.log
    ErrorSRC = Error(log)
    Requests = Requests(version, log, ErrorSRC)

    player_stats = PlayerStats(Requests, log, "a")
