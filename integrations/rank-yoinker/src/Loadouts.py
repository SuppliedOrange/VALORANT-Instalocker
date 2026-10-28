import time
import requests
from src.colors import color
from src.constants import sockets, hide_names


class Loadouts:
    def __init__(self, Requests, log, colors, Server, current_map):

        self.Requests = Requests
        self.log = log
        self.colors = colors
        self.Server = Server
        self.current_map = current_map

    def get_match_loadouts(self, match_id, players, weaponChoose, valoApiSkins, names, state="game"):
        weaponLists = {}
        valApiWeapons = requests.get(
            "https://valorant-api.com/v1/weapons").json()
        if state == "game":
            team_id = "Blue"
            PlayerInventorys = self.Requests.fetch(
                "glz", f"/core-game/v1/matches/{match_id}/loadouts", "get")
        elif state == "pregame":
            pregame_stats = players
            players = players["AllyTeam"]["Players"]
            team_id = pregame_stats['Teams'][0]['TeamID']
            PlayerInventorys = self.Requests.fetch(
                "glz", f"/pregame/v1/matches/{match_id}/loadouts", "get")

        # subject (player UUID) -> loadout lookup
        loadout_by_subject = {}
        for loadout_entry in PlayerInventorys["Loadouts"]:
            subj = loadout_entry.get("Subject", "").lower()
            # if player has an agent != spectator
            char_id = loadout_entry.get("CharacterID", "")
            if subj and (state == "pregame" or char_id):
                loadout_by_subject[subj] = loadout_entry["Loadout"] if state == "game" else loadout_entry

        for player in players:
            subj = player.get("Subject", "").lower()
            inv = loadout_by_subject.get(subj)
            if inv is None:
                continue
            for weapon in valApiWeapons["data"]:
                if weapon["displayName"].lower() == weaponChoose.lower():
                    skin_id = \
                        inv["Items"][weapon["uuid"].lower()]["Sockets"]["bcef87d6-209b-46c6-8b19-fbe40bd95abc"]["Item"][
                            "ID"]
                    json_data = valoApiSkins.json()

                    if "data" not in json_data:
                        self.log("Skins API response missing 'data'.")
                        return None

                    for skin in json_data["data"]:
                        if skin_id.lower() == skin["uuid"].lower():
                            rgb_color = self.colors.get_rgb_color_from_skin(
                                skin["uuid"].lower(), valoApiSkins)
                            skin_display_name = skin["displayName"].replace(
                                f" {weapon['displayName']}", "")
                            # if rgb_color is not None:
                            weaponLists.update({player["Subject"]: color(
                                skin_display_name, fore=rgb_color)})
                            # else:
                            #     weaponLists.update({player["Subject"]: color(skin["Name"], fore=rgb_color)})
        final_json = self.convertLoadoutToJsonArray(
            PlayerInventorys, players, state, names, team_id=team_id)
        # self.log(f"json for website: {final_json}")
        self.Server.send_payload("matchLoadout", final_json)
        return [weaponLists, final_json]

    # this will convert valorant loadouts to json with player names
    def convertLoadoutToJsonArray(self, PlayerInventorys, players, state, names, team_id=None):
        # get agent dict from main in future
        # names = self.namesClass.get_names_from_puuids(players)
        valoApiSprays = requests.get("https://valorant-api.com/v1/sprays")
        valoApiFlex = requests.get("https://valorant-api.com/v1/flex")
        valoApiWeapons = requests.get("https://valorant-api.com/v1/weapons")
        valoApiBuddies = requests.get("https://valorant-api.com/v1/buddies")
        valoApiAgents = requests.get("https://valorant-api.com/v1/agents")
        valoApiTitles = requests.get(
            "https://valorant-api.com/v1/playertitles")
        valoApiPlayerCards = requests.get(
            "https://valorant-api.com/v1/playercards")

        final_final_json = {"Players": {},
                            "time": int(time.time()),
                            "map": self.current_map}

        final_json = final_final_json["Players"]
        if state == "pregame":
            PlayerInventorys = PlayerInventorys["Loadouts"]
        elif state == "game":
            PlayerInventorys = PlayerInventorys["Loadouts"]

        # subject (player UUID) -> full loadout entry lookup
        loadout_by_subject = {}
        for entry in PlayerInventorys:
            subj = entry.get("Subject", "").lower()
            # if player has an agent != spectator
            char_id = entry.get("CharacterID", "")
            if subj and (state == "pregame" or char_id):
                # Keep the full entry so metadata like CharacterID is not lost.
                loadout_by_subject[subj] = entry

        for player in players:
            subject = player["Subject"]
            subj = subject.lower()
            loadout_entry = loadout_by_subject.get(subj)

            final_json.update(
                {
                    subject: {}
                }
            )

            # skip if not found
            if loadout_entry is None:
                continue

            PlayerInventory = loadout_entry.get("Loadout", loadout_entry)

            # Riot can return CharacterID in different places and with different casing.
            # Keep Name separate: only use the agent name as Name when hide_names is enabled.
            character_id = (
                player.get("CharacterID")
                or loadout_entry.get("CharacterID")
                or PlayerInventory.get("CharacterID")
                or ""
            ).lower()

            # creates name field
            if hide_names:
                if state == "game":
                    for agent in valoApiAgents.json()["data"]:
                        if agent["uuid"].lower() == character_id:
                            final_json[subject].update(
                                {"Name": agent["displayName"]})
                            break
            else:
                player_name = names.get(subject) or names.get(subject.lower())

                if player_name and player_name != "#":
                    final_json[subject].update({"Name": player_name})
                else:
                    final_json[subject].update({"Name": None})

            # creates team field
            final_json[subject].update({"Team": player.get("TeamID", team_id)})

            # create spray field
            final_json[subject].update({"Sprays": {}})
            # append sprays to field

            final_json[subject].update(
                {"Level": player["PlayerIdentity"]["AccountLevel"]})

            for title in valoApiTitles.json()["data"]:
                if title["uuid"] == player["PlayerIdentity"]["PlayerTitleID"]:
                    final_json[subject].update(
                        {"Title": title["titleText"]})

            for PCard in valoApiPlayerCards.json()["data"]:
                if PCard["uuid"] == player["PlayerIdentity"]["PlayerCardID"]:
                    final_json[subject].update(
                        {"PlayerCard": PCard["largeArt"]})

            for agent in valoApiAgents.json()["data"]:
                if agent["uuid"].lower() == character_id:
                    final_json[subject].update(
                        {"AgentArtworkName": agent["displayName"] + "Artwork"})
                    final_json[subject].update(
                        {"Agent": agent["displayIcon"]})
                    break

            sprays_by_uuid = {
                s["uuid"].lower(): s
                for s in valoApiSprays.json().get("data", [])
                if isinstance(s, dict) and s.get("uuid")
            }
            flex_by_uuid = {
                f["uuid"].lower(): f
                for f in valoApiFlex.json().get("data", [])
                if isinstance(f, dict) and f.get("uuid")
            }
            expression_selections = PlayerInventory.get("Expressions", {}).get("AESSelections", [])
            for j, expr in enumerate(expression_selections):
                asset_id = (expr.get("AssetID") or "").lower()
                if not asset_id:
                    continue

                expression_data = sprays_by_uuid.get(asset_id)
                expression_type = "spray" if expression_data else None
                if expression_data is None:
                    expression_data = flex_by_uuid.get(asset_id)
                    expression_type = "flex" if expression_data else "unknown"

                entry = {"type": expression_type}
                if expression_data:
                    entry.update({
                        "displayName": expression_data.get("displayName", ""),
                        "displayIcon": expression_data.get("displayIcon"),
                        "fullTransparentIcon": expression_data.get("fullTransparentIcon") or expression_data.get("displayIcon"),
                    })
                final_json[subject]["Sprays"].update({j: entry})

            # create weapons field
            final_json[subject].update({"Weapons": {}})

            for skin in PlayerInventory["Items"]:

                # create skin field
                final_json[subject]["Weapons"].update({skin: {}})

                for socket in PlayerInventory["Items"][skin]["Sockets"]:
                    # predefined sockets
                    for var_socket in sockets:
                        if socket == sockets[var_socket]:
                            final_json[subject]["Weapons"][skin].update(
                                {
                                    var_socket: PlayerInventory["Items"][skin]["Sockets"][socket]["Item"]["ID"]
                                }
                            )

                # create buddy field
                # self.log("predefined sockets")
                # final_json[subject]["Weapons"].update({skin: {}})

                # buddies
                for socket in PlayerInventory["Items"][skin]["Sockets"]:
                    if sockets["skin_buddy"] == socket:
                        for buddy in valoApiBuddies.json()["data"]:
                            if buddy["uuid"] == PlayerInventory["Items"][skin]["Sockets"][socket]["Item"]["ID"]:
                                final_json[subject]["Weapons"][skin].update(
                                    {
                                        "buddy_displayIcon": buddy["displayIcon"]
                                    }
                                )

                # append names to field
                for weapon in valoApiWeapons.json()["data"]:
                    if skin == weapon["uuid"]:
                        final_json[subject]["Weapons"][skin].update(
                            {
                                "weapon": weapon["displayName"]
                            }
                        )
                        for skinValApi in weapon["skins"]:
                            if skinValApi["uuid"] == PlayerInventory["Items"][skin]["Sockets"][sockets["skin"]]["Item"]["ID"]:
                                final_json[subject]["Weapons"][skin].update(
                                    {
                                        "skinDisplayName": skinValApi["displayName"]
                                    }
                                )
                                for chroma in skinValApi["chromas"]:
                                    if chroma["uuid"] == PlayerInventory["Items"][skin]["Sockets"][sockets["skin_chroma"]]["Item"]["ID"]:
                                        if chroma["displayIcon"] != None:
                                            final_json[subject]["Weapons"][skin].update(
                                                {
                                                    "skinDisplayIcon": chroma["displayIcon"]
                                                }
                                            )
                                        elif chroma["fullRender"] != None:
                                            final_json[subject]["Weapons"][skin].update(
                                                {
                                                    "skinDisplayIcon": chroma["fullRender"]
                                                }
                                            )
                                        elif skinValApi["displayIcon"] != None:
                                            final_json[subject]["Weapons"][skin].update(
                                                {
                                                    "skinDisplayIcon": skinValApi["displayIcon"]
                                                }
                                            )
                                        else:
                                            final_json[subject]["Weapons"][skin].update(
                                                {
                                                    "skinDisplayIcon": skinValApi["levels"][0]["displayIcon"]
                                                }
                                            )
                                if skinValApi["displayName"].startswith("Standard") or skinValApi["displayName"].startswith("Melee"):
                                    final_json[subject]["Weapons"][skin]["skinDisplayIcon"] = weapon["displayIcon"]

        return final_final_json
