# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" } 

from genlayer import *
from dataclasses import dataclass
import json


@allow_storage
@dataclass
class Package:
    github_user: str
    repo_owner: str
    repo_name: str
    package_url: str
    owner_wallet: Address
    emergency_wallet: Address
    emergency_github: str
    threshold_days: u256
    grace_period_days: u256
    last_ping: u256
    registered_at: u256
    status: str                 # "active" | "flagged" | "transferred" | "withdrawn"
    flagged_at: u256
    flagged_by: Address
    verdict_reason: str
    last_evidence: str
    check_fee_locked: u256


@gl.evm.contract_interface
class _EOA:
    class View:
        pass
    class Write:
        pass


SECONDS_PER_DAY: u256 = u256(86400)
MIN_THRESHOLD_DAYS: u256 = u256(60)
DEFAULT_GRACE_DAYS: u256 = u256(14)
CHECK_FEE: u256 = u256(50000000000000000)       # 0.05 GEN
FLAGGER_REWARD: u256 = u256(30000000000000000)  # 0.03 GEN


class CronosRegistry(gl.Contract):
    packages: DynArray[Package]
    package_count: u256
    owner: Address

    def __init__(self):
        self.package_count = u256(0)
        self.owner = gl.message.sender_address

    # ---------- helpers ----------

    def _find_index(self, github_user: str) -> int:
        key = github_user.lower()
        n = len(self.packages)
        for i in range(n):
            if str(self.packages[i].github_user) == key:
                return i
        return -1

    # ---------- writes ----------

    @gl.public.write
    def register(
        self,
        github_user: str,
        repo_owner: str,
        repo_name: str,
        package_url: str,
        emergency_wallet: str,
        emergency_github: str,
        threshold_days: u256,
        grace_period_days: u256,
    ) -> u256:
        """
        Register a package under dead-man's-switch protection.

        If this github_user already has a non-active entry (withdrawn or
        transferred), that entry is overwritten in place rather than
        appending a new one — _find_index() always returns the first match
        by github_user, so a stale duplicate left in the array would
        permanently shadow the new active registration and make it
        unreachable through the public API.
        """
        key = github_user.lower()
        assert len(key) > 0, "GitHub username required"
        assert len(repo_name) > 0, "Repo name required"
        assert int(threshold_days) >= int(MIN_THRESHOLD_DAYS), "Threshold must be at least 60 days"

        existing_idx = self._find_index(key)
        if existing_idx >= 0:
            assert str(self.packages[existing_idx].status) != "active", \
                "This GitHub user already has an active registration"

        sender = gl.message.sender_address
        emergency_addr = Address(emergency_wallet)
        assert emergency_addr != sender, "Emergency maintainer cannot be the same wallet"

        grace = grace_period_days
        if int(grace) < 1:
            grace = DEFAULT_GRACE_DAYS

        ts = u256(int(gl.message.timestamp)) if hasattr(gl.message, "timestamp") else u256(0)

        if existing_idx >= 0:
            # Reuse the existing slot — re-registering after a withdrawal
            # or a confirmed transfer resets it back to a fresh active state.
            p = self.packages[existing_idx]
            p.repo_owner = repo_owner
            p.repo_name = repo_name
            p.package_url = package_url
            p.owner_wallet = sender
            p.emergency_wallet = emergency_addr
            p.emergency_github = emergency_github
            p.threshold_days = threshold_days
            p.grace_period_days = grace
            p.last_ping = ts
            p.registered_at = ts
            p.status = "active"
            p.flagged_at = u256(0)
            p.flagged_by = Address("0x0000000000000000000000000000000000000000")
            p.verdict_reason = ""
            p.last_evidence = ""
            p.check_fee_locked = u256(0)
            return u256(existing_idx)

        pkg_id = self.package_count
        pkg = gl.storage.inmem_allocate(
            Package,
            key, repo_owner, repo_name, package_url,
            sender, emergency_addr, emergency_github,
            threshold_days, grace,
            ts, ts,
            "active",
            u256(0), Address("0x0000000000000000000000000000000000000000"),
            "", "",
            u256(0),
        )
        self.packages.append(pkg)
        self.package_count = self.package_count + u256(1)
        return pkg_id

    @gl.public.write
    def ping(self, github_user: str) -> None:
        """Maintainer proves they are still active. Resets the inactivity timer."""
        idx = self._find_index(github_user)
        assert idx >= 0, "No package registered under this GitHub user"

        p = self.packages[idx]
        assert p.owner_wallet == gl.message.sender_address, "Only the registered maintainer can ping"
        assert str(p.status) != "transferred", "Package has already been transferred"
        assert str(p.status) != "withdrawn", "Package has been withdrawn from the registry"

        ts = u256(int(gl.message.timestamp)) if hasattr(gl.message, "timestamp") else u256(0)
        p.last_ping = ts

        if str(p.status) == "flagged":
            p.status = "active"
            p.verdict_reason = "Maintainer responded within grace period — flag cleared."
            if int(p.check_fee_locked) > 0:
                refund = p.check_fee_locked
                p.check_fee_locked = u256(0)
                _EOA(p.flagged_by).emit_transfer(value=refund)

    @gl.public.write.payable
    def check_activity(self, github_user: str) -> str:
        """
        Anyone can trigger a check once the inactivity threshold has passed.
        Requires CHECK_FEE to prevent spam. Triggers AI consensus evaluation
        of the maintainer's GitHub profile and repository commit activity.
        """
        idx = self._find_index(github_user)
        assert idx >= 0, "No package registered under this GitHub user"

        fee_sent = gl.message.value
        assert int(fee_sent) >= int(CHECK_FEE), "Check requires 0.05 GEN fee"

        p = self.packages[idx]
        assert str(p.status) == "active", "Package is not in active state"

        ts = u256(int(gl.message.timestamp)) if hasattr(gl.message, "timestamp") else u256(0)
        elapsed_days = (ts - p.last_ping) // SECONDS_PER_DAY
        assert int(elapsed_days) >= int(p.threshold_days), "Inactivity threshold not yet reached"

        checker = gl.message.sender_address

        # Flip to flagged immediately — deterministic, before AI evaluation
        p.status = "flagged"
        p.flagged_at = ts
        p.flagged_by = checker
        p.check_fee_locked = fee_sent

        gh_user = str(p.github_user)
        repo_owner_val = str(p.repo_owner)
        repo_name_val = str(p.repo_name)
        days_inactive = int(elapsed_days)
        threshold_int = int(p.threshold_days)

        def evaluate_inactivity() -> str:
            profile_url = "https://github.com/" + gh_user
            commits_url = "https://github.com/" + repo_owner_val + "/" + repo_name_val + "/commits"

            profile_page = gl.nondet.web.get(profile_url).body.decode("utf-8")
            commits_page = gl.nondet.web.get(commits_url).body.decode("utf-8")

            prompt = (
                "You are evaluating whether an open-source maintainer is inactive, "
                "based on their GitHub profile and recent commit history on their repository.\n\n"
                "GITHUB USERNAME: " + gh_user + "\n"
                "REPOSITORY: " + repo_owner_val + "/" + repo_name_val + "\n"
                "DAYS SINCE LAST ONCHAIN HEARTBEAT: " + str(days_inactive) + "\n"
                "INACTIVITY THRESHOLD: " + str(threshold_int) + " days\n\n"
                "GITHUB PROFILE PAGE (raw HTML, look for contribution/activity markers):\n"
                + profile_page[:2000] + "\n\n"
                "REPOSITORY COMMITS PAGE (raw HTML, look for commit dates):\n"
                + commits_page[:2000] + "\n\n"
                "Determine whether there is any commit, comment, or contribution activity "
                "recent enough to suggest the maintainer is still active and engaged with "
                "this specific repository. A maintainer active elsewhere but absent from "
                "this repo should still be considered INACTIVE for this repository.\n\n"
                "Reply ONLY valid JSON, no markdown, no code fences:\n"
                "{\"verdict\":\"INACTIVE\",\"confidence\":\"HIGH\",\"evidence\":\"short phrase\"}"
                " or {\"verdict\":\"ACTIVE\",\"confidence\":\"HIGH\",\"evidence\":\"short phrase\"}"
            )
            raw = gl.nondet.exec_prompt(prompt)
            raw = raw.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(raw)
            return json.dumps(parsed, sort_keys=True)

        result_str = gl.eq_principle.prompt_comparative(
            evaluate_inactivity,
            "The verdict field must be identical (INACTIVE or ACTIVE)",
        )
        result = json.loads(result_str)
        verdict = result.get("verdict", "ACTIVE")
        confidence = result.get("confidence", "LOW")
        evidence = result.get("evidence", "")

        # Re-fetch — maintainer may have pinged during the evaluation window
        p = self.packages[idx]
        if str(p.status) == "active":
            p.verdict_reason = "Maintainer became active during evaluation window."
            p.last_evidence = evidence
            return result_str

        if verdict == "INACTIVE":
            p.status = "transferred"
            p.verdict_reason = "[" + confidence + "] " + evidence
            p.last_evidence = evidence
            if int(p.check_fee_locked) > 0:
                reward = FLAGGER_REWARD
                if int(reward) > int(p.check_fee_locked):
                    reward = p.check_fee_locked
                # Any amount above the reward simply stays in the contract's
                # own GEN balance — no transfer call needed for that part.
                p.check_fee_locked = u256(0)
                _EOA(p.flagged_by).emit_transfer(value=reward)
        else:
            p.status = "active"
            p.verdict_reason = "Check rejected — [" + confidence + "] " + evidence
            p.last_evidence = evidence
            p.flagged_at = u256(0)
            p.flagged_by = Address("0x0000000000000000000000000000000000000000")
            # Checker forfeits the fee as a false-flag penalty — stays in contract balance
            p.check_fee_locked = u256(0)

        return result_str

    @gl.public.write
    def update_emergency_maintainer(
        self, github_user: str, new_emergency_wallet: str, new_emergency_github: str
    ) -> None:
        idx = self._find_index(github_user)
        assert idx >= 0, "No package registered under this GitHub user"
        p = self.packages[idx]
        assert p.owner_wallet == gl.message.sender_address, "Only the registered maintainer can update"
        assert str(p.status) == "active", "Package must be active"

        new_addr = Address(new_emergency_wallet)
        assert new_addr != p.owner_wallet, "Emergency maintainer cannot be the same wallet"
        p.emergency_wallet = new_addr
        p.emergency_github = new_emergency_github

    @gl.public.write
    def update_threshold(self, github_user: str, new_threshold_days: u256) -> None:
        idx = self._find_index(github_user)
        assert idx >= 0, "No package registered under this GitHub user"
        p = self.packages[idx]
        assert p.owner_wallet == gl.message.sender_address, "Only the registered maintainer can update"
        assert str(p.status) == "active", "Package must be active"
        assert int(new_threshold_days) >= int(MIN_THRESHOLD_DAYS), "Threshold must be at least 60 days"
        p.threshold_days = new_threshold_days

    @gl.public.write
    def withdraw(self, github_user: str) -> None:
        """Maintainer voluntarily removes their package from dead-man's-switch protection."""
        idx = self._find_index(github_user)
        assert idx >= 0, "No package registered under this GitHub user"
        p = self.packages[idx]
        assert p.owner_wallet == gl.message.sender_address, "Only the registered maintainer can withdraw"
        assert str(p.status) == "active", "Package must be active"
        p.status = "withdrawn"
        p.verdict_reason = "Maintainer voluntarily withdrew from registry."

    # ---------- views ----------

    @gl.public.view
    def get_package(self, github_user: str) -> dict:
        idx = self._find_index(github_user)
        if idx < 0:
            return {"found": False}
        p = self.packages[idx]
        return {
            "found": True,
            "github_user": str(p.github_user),
            "repo_owner": str(p.repo_owner),
            "repo_name": str(p.repo_name),
            "package_url": str(p.package_url),
            "owner_wallet": p.owner_wallet.as_hex,
            "emergency_wallet": p.emergency_wallet.as_hex,
            "emergency_github": str(p.emergency_github),
            "threshold_days": int(p.threshold_days),
            "grace_period_days": int(p.grace_period_days),
            "last_ping": int(p.last_ping),
            "registered_at": int(p.registered_at),
            "status": str(p.status),
            "flagged_at": int(p.flagged_at),
            "flagged_by": p.flagged_by.as_hex,
            "verdict_reason": str(p.verdict_reason),
            "last_evidence": str(p.last_evidence),
        }

    @gl.public.view
    def get_all_packages(self) -> list:
        result = []
        for i in range(int(self.package_count)):
            p = self.packages[i]
            result.append({
                "index": i,
                "github_user": str(p.github_user),
                "repo_owner": str(p.repo_owner),
                "repo_name": str(p.repo_name),
                "status": str(p.status),
                "threshold_days": int(p.threshold_days),
                "owner_wallet": p.owner_wallet.as_hex,
            })
        return result

    @gl.public.view
    def get_days_inactive(self, github_user: str) -> int:
        idx = self._find_index(github_user)
        if idx < 0:
            return 0
        p = self.packages[idx]
        ts = u256(int(gl.message.timestamp)) if hasattr(gl.message, "timestamp") else u256(0)
        return int((ts - p.last_ping) // SECONDS_PER_DAY)

    @gl.public.view
    def is_checkable(self, github_user: str) -> bool:
        idx = self._find_index(github_user)
        if idx < 0:
            return False
        p = self.packages[idx]
        if str(p.status) != "active":
            return False
        ts = u256(int(gl.message.timestamp)) if hasattr(gl.message, "timestamp") else u256(0)
        elapsed_days = (ts - p.last_ping) // SECONDS_PER_DAY
        return int(elapsed_days) >= int(p.threshold_days)

    @gl.public.view
    def is_transfer_authorized(self, github_user: str) -> bool:
        """Used by off-chain agents (e.g. a GitHub Action) to check if takeover is authorized."""
        idx = self._find_index(github_user)
        if idx < 0:
            return False
        return str(self.packages[idx].status) == "transferred"

    @gl.public.view
    def get_package_count(self) -> u256:
        return self.package_count

    @gl.public.view
    def get_owner(self) -> str:
        return self.owner.as_hex
