import asyncio
import json
import logging
import os
import random
import sys
import time

from uuid import uuid4
from aiohttp import ClientError

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # noqa

from runners.support.agent import DemoAgent, default_genesis_txns
from runners.support.utils import (
    log_json,
    log_msg,
    log_status,
    log_timer,
    prompt,
    prompt_loop,
    require_indy,
)

CRED_PREVIEW_TYPE = (
    "did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/issue-credential/1.0/credential-preview"
)

TAILS_FILE_COUNT = int(os.getenv("TAILS_FILE_COUNT", 100))

LOGGER = logging.getLogger(__name__)


class HseAgent(DemoAgent):
    def __init__(self, http_port: int, admin_port: int, **kwargs):
        super().__init__(
            "HSE Agent",
            http_port,
            admin_port,
            prefix="HSE",
            # extra_args=["--auto-accept-invites", "--auto-accept-requests"],
            **kwargs,
        )
        self.connection_id = None
        self._connection_ready = asyncio.Future()
        self.cred_state = {}
        # TODO define a dict to hold credential attributes
        # based on credential_definition_id
        self.cred_attrs = {}

    async def detect_connection(self):
        await self._connection_ready

    @property
    def connection_ready(self):
        return self._connection_ready.done() and self._connection_ready.result()

    async def handle_connections(self, message):
        if message["connection_id"] == self.connection_id:
            if message["state"] == "active" and not self._connection_ready.done():
                self.log("Connected")
                self._connection_ready.set_result(True)

    async def handle_issue_credential(self, message):
        state = message["state"]
        credential_exchange_id = message["credential_exchange_id"]
        prev_state = self.cred_state.get(credential_exchange_id)
        if prev_state == state:
            return  # ignore
        self.cred_state[credential_exchange_id] = state

        self.log(
            "Credential: state =",
            state,
            ", credential_exchange_id =",
            credential_exchange_id,
        )

        if state == "request_received":
            log_status("#17 Issue credential to X")
            # issue credentials based on the credential_definition_id
            cred_attrs = self.cred_attrs[message["credential_definition_id"]]
            cred_preview = {
                "@type": CRED_PREVIEW_TYPE,
                "attributes": [
                    {"name": n, "value": v} for (n, v) in cred_attrs.items()
                ],
            }
            await self.admin_POST(
                f"/issue-credential/records/{credential_exchange_id}/issue",
                {
                    "comment": f"Issuing credential, exchange {credential_exchange_id}",
                    "credential_preview": cred_preview,
                },
            )

    async def handle_present_proof(self, message):
        state = message["state"]

        presentation_exchange_id = message["presentation_exchange_id"]
        self.log(
            "Presentation: state =",
            state,
            ", presentation_exchange_id =",
            presentation_exchange_id,
        )

        if state == "presentation_received":
            log_status("#27 Process the proof provided by X")
            log_status("#28 Check if proof is valid")
            proof = await self.admin_POST(
                f"/present-proof/records/{presentation_exchange_id}/"
                "verify-presentation"
            )
            self.log("Proof =", proof["verified"])

    async def handle_basicmessages(self, message):
        self.log("Received message:", message["content"])

async def create_schema_and_cred_def(agent, revocation):
    with log_timer("Publish schema/cred def duration"):
        log_status("#3/4 Create a new schema/cred def on the ledger")
        version = format(
            "%d.%d.%d"
            % (
                random.randint(1,101),
                random.randint(1,101),
                random.randint(1,101),
            )
        )
        (_, cred_def_id,) = await agent.register_schema_and_creddef(
            "vaccination schema", 
            version, 
            ["name", "vaccination_date", "vaccination_type", "doses"],
            support_revocation=revocation,
            revocation_registry_size=TAILS_FILE_COUNT if revocation else None,
        )
        return cred_def_id

async def main(
    start_port: int, 
    show_timing: bool = False,
    revocation: bool = False):

    genesis = await default_genesis_txns()
    if not genesis:
        print("Error retrieving ledger genesis transactions")
        sys.exit(1)

    agent = None

    try:
        log_status("#1 Provision an agent and wallet, get back configuration details")
        agent = HseAgent(
            start_port, start_port + 1, genesis_data=genesis, timing=show_timing
        )
        await agent.listen_webhooks(start_port + 2)
        await agent.register_did()

        with log_timer("Startup duration:"):
            await agent.start_process()
        log_msg("Admin url is at:", agent.admin_url)
        log_msg("Endpoint url is at:", agent.endpoint)

        # Create a schema
        cred_def_id = await create_schema_and_cred_def(agent, revocation)

        options = (
            "    (1) Issue Credential\n"
            "    (2) Send Proof Request\n"
            "    (3) Send Message\n"
            "    (4) Create New Invitation\n"
        )

        if revocation:
            options += "    (5) Revoke Credential\n" "    (6) Publish Revocations\n"
        options += "    (X) Exit?\n[1/2/3/4/{}X] ".format(
            "5/6/" if revocation else "",
        )
        async for option in prompt_loop(options):
            if option is not None:
                option = option.strip()

            if option is None or option in "xX":
                break

            elif option == "1":
                log_status("#13 Issue credential offer to X")

                # TODO define attributes to send for credential
                agent.cred_attrs[cred_def_id] = {
                    "name": "Alice Smith",
                    "vaccination_date": "2018-05-28",
                    "vaccination_type": "Maths",
                    "doses": "24",
                    "timestamp": str(int(time.time())),
                }

                cred_preview = {
                    "@type": CRED_PREVIEW_TYPE,
                    "attributes": [
                        {"name": n, "value": v}
                        for (n, v) in agent.cred_attrs[cred_def_id].items()
                    ],
                }
                offer_request = {
                    "connection_id": agent.connection_id,
                    "cred_def_id": cred_def_id,
                    "comment": f"Offer on cred def id {cred_def_id}",
                    "credential_preview": cred_preview,
                    # "filter" : {"indy": {"cred_def_id": cred_def_id}}
                }
                await agent.admin_POST("/issue-credential/send-offer", offer_request)

                # TODO issue an additional credential for Student ID

            elif option == "2":
                log_status("#20 Request proof of degree from alice")
                req_attrs = [
                    {"name": "name", "restrictions": [{"issuer_did": agent.did}]},
                    {"name": "date", "restrictions": [{"issuer_did": agent.did}]},
                    {"name": "degree", "restrictions": [{"issuer_did": agent.did}]},
                    {"name": "self_attested_thing"},
                ]
                if revocation:
                    req_attrs.append(
                        {
                            "name": "degree",
                            "restrictions": [{"schema name": "degree schema"}],
                            "non_revoked": {"to": int(time.time() - 1)},
                        },
                    )
                else:
                    req_attrs.append(
                        {
                            "name": "degree",
                            "restrictions": [{"schema name": "degree schema"}],
                        }
                    )
                req_preds = [
                    {
                        "name": "age",
                        "p_type": ">=",
                        "p_value": 18,
                        "restrictions": [{"issuer_did": agent.did}],
                    }
                ]
                indy_proof_request = {
                    "name": "Proof of Education",
                    "version": "1.0",
                    "nonce": str(uuid4().int),
                    "requested_attributes": {
                        f"0_{req_attr['name']}_uuid": req_attr for req_attr in req_attrs
                    },
                    "requested_predicates": {
                        f"0_{req_pred['name']}_GE_uuid": req_pred
                        for req_pred in req_preds
                    },
                }
                if revocation:
                    indy_proof_request["non_revoked"] = {"to":int(time.time())}
                
                proof_request_web_request = {
                    "connection_id": agent.connection_id,
                    "proof_request": indy_proof_request,
                }
                
                await agent.admin_POST(
                    "/present-proof/send-request", proof_request_web_request
                )

            elif option == "3":
                msg = await prompt("Enter message: ")
                await agent.admin_POST(
                    f"/connections/{agent.connection_id}/send-message", {"content": msg}
                )

            elif option == "5" and revocation:
                rev_reg_id = (await prompt("Enter revocation registry ID: ")).strip()
                cred_rev_id = (await prompt("Enter credential revocation ID: ")).strip()
                publish = (
                    await prompt("Publish now? [Y/N] ", default="N")
                ).strip() in "yY"
                try:
                    await agent.admin_POST(
                        "/revocation/revoke",
                        {
                            "rev_reg_id": rev_reg_id,
                            "cred_rev_id": cred_rev_id,
                            "publish": publish,
                        },
                    )
                except ClientError:
                    pass

            elif option == "6" and revocation:
                try:
                    resp = await agent.admin_POST("/revocation/publish-revocations", {})
                    agent.log(
                        "Published revocations for {} revocation register{} {}".format(
                            len(resp["rrid2crid"]),
                            "y" if len(resp["rrid2crid"]) == 1 else "ies",
                            json.dumps([k for k in resp["rrid2crid"]], indent=4),
                        )
                    )
                except ClientError:
                    pass


        if show_timing:
            timing = await agent.fetch_timing()
            if timing:
                for line in agent.format_timing(timing):
                    log_msg(line)

    finally:
        terminated = True
        try:
            if agent:
                await agent.terminate()
        except Exception:
            LOGGER.exception("Error terminating agent:")
            terminated = False

    await asyncio.sleep(0.1)

    if not terminated:
        os._exit(1)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Runs a HSE demo agent.")
    parser.add_argument(
        "-p",
        "--port",
        type=int,
        default=8020,
        metavar=("<port>"),
        help="Choose the starting port number to listen on",
    )
    parser.add_argument(
        "--timing", action="store_true", help="Enable timing information"
    )
    parser.add_argument(
        "--revocation", action="store_true", help="Enable credential revocation"
    )
    args = parser.parse_args()

    require_indy()

    # tails_server_base_url = args.tails_server_base_url or os.getenv("PUBLIC_TAILS_URL")

    # if args.revocation and not tails_server_base_url:
    #     raise Exception(
    #         "If revocation is enabled, --tails_server_base_url must be provided"
    #     )

    try:
        asyncio.get_event_loop().run_until_complete(
            main(
                args.port, 
                args.timing,
                args.revocation,
            )
        )
    except KeyboardInterrupt:
        os._exit(1)
