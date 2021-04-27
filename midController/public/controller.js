Vue.component("modal", {
    template: "#modal-template"
});

Vue.component("loading-modal", {
    template: "#loading-modal-template"
});


var app = new Vue({
    el: '#app',
    data: {

        /* General */
        // HSE: [Alice: xyz] = Hse -> Alice conn ID = xyz 
        connection_ids: {},
        revokeFactor: 1,
        usedFactors: [],
        revokedIndices: {},
        // {
        //     <factor>: true/false,
        // }

        initLoading: true,
        loadingModalStatus: [],
        showLoadModal: true,

        /* HSE */
        hseInvite: null,
        hseInviteText: "Click 'Generate Invite!'",

        vaccine_options: [
            'Pfizer-BioNTech',
            'Moderna',
            'AstraZeneca-Oxford',
            'Johnson & Johnson',
            'Sputnik'
        ],
        dose_options: [
            '1',
            '2'
        ],

        hse_conn_options: [],
        cred_issue_date: new Date().toISOString().slice(0, 10),
        cred_issue_name_drop: null,
        cred_issue_type_drop: null,
        cred_issue_dose_drop: null,
        cred_issue_conn_id: null,
        cred_issue_fullname: null,
        cred_issue_centre: null,
        hseCredIssueText: "Issue a credential first!",

            /* HSE Status */ 
        hseInviteStatus: null,
        hseIssueStatus: null,
        hseIssueCredStatus: "HSE Issuing Credential",
        revokeUpdate: "",

        hseDIDs: ['Nothing here!'],
        hseConns: ['Nothing here!'],
        hseCreds: ['Nothing here!'],
        hseCredentialsText: "Nothing here!",
        hseIssuedCreds: [
            {factor: "Nothing", cred: "Nothing"}
        ],
        hseRevokedCreds: [],
        hseCredsToRevoked: {},

        showHSEModal: false,
        revokeModalShown: false,

        /*Aer Lingus*/
        alInvite: null,
        alInviteText: "Click 'Generate Invite!'",
        predicate_options: [
            '>',
            '>=',
            '<=',
            '<'
        ],
        ALProofReqText: 'Request a Proof First!',
        proof_req_conn_id: null,
        al_conn_options: [],
        proof_req_name_drop: null,
        proof_req_pred_drop: null,
        proof_req_doses_drop: null,
        proof_req_fullname_check: false,
        proof_req_type_check: false,
        proof_req_date_check: false,
        proof_req_centre_check: false,
        zkpRadio: false,

        ALProofRespText: "Request a proof first!",
        ALProofVerificationText: "Verify a proof first!",

            /* AL Status */
        alInviteStatus: null,
        requestProofStatus: null,
        alVerifyPrfStatus: null,
        alReqProofStatus: "AL Requesting Proof",

        alDIDs: ['Nothing here!'],
        alConns: ['Nothing here!'],
        alCreds: ['Nothing here!'],
        alCredentialsText: "Nothing here!",

        showALModal: false,

        dummyResp: "",
        
        /* Alice */
        aliceInviteText: "Load invite first!",
        aliceRadioFrom: 'HSE',
        aliceAcceptInvStatus: "",

        aliceDIDs: ['Nothing here!'],
        aliceConns: ['Nothing here!'],
        aliceCreds: ['Nothing here!'],
        aliceCredentialsText: "Nothing here!",

        aliceConfirmQuery: "Nothing here!",
        aliceMoreInfo: "Nothing here!",

        showAliceModal: false,

        /* Bob */
        bobInviteText: "Load invite first!",
        bobRadioFrom: 'HSE',
        bobAcceptInvStatus: "",

        bobDIDs: ['Nothing here!'],
        bobConns: ['Nothing here!'],
        bobCreds: ['Nothing here!'],
        bobCredentialsText: "Nothing here!",

        bobConfirmQuery: "Nothing here!",
        bobMoreInfo: "Nothing here!",

        showBobModal: false
    },


    methods: {

        /* HSE */
        HSEInviteButton: createHSEInvite,
        HSEIssueCredButton: hseIssueCred,
        ShowHSEModalBtn: showHSEModal,
        HSEWalletCredClick: hseWalletCredClick,
        CloseHSEModal: closeHSEModal,
        ShowHSERevokeModal: showRevokeModal,
        CloseRevokeModal: closeRevokeModal,
        SelectCred: selectCred,
        HSEGenerateQR: hseGenerateQR,

        /* Aer Lingus */
        ALInvite: createALInvite,
        HandleProofReq: handleProofReq,
        ShowALModalBtn: showALModal,
        ALVerifyProofButton: alVerifyProof,
        ALWalletCredClick: alWalletCredClick,
        CloseALModal: closeALModal,
        ALgenerateQR: alGenerateQR, 

        /* Alice */
        AliceLoadInv: setAliceInviteText,
        AliceAcceptInvite: aliceAcceptInv,
        ShowAliceModal: showAliceModal,
        AliceWalletCredClick: aliceWalletCredClick,
        CloseAliceModal: closeAliceModal,
        AliceConfirm: aliceConfirm,
        AliceReject: aliceReject,

        /* Bob */
        BobLoadInv: setBobInviteText,
        BobAcceptInvite: bobAcceptInv,
        ShowBobModal: showBobModal,
        BobWalletCredClick: bobWalletCredClick,
        CloseBobModal: closeBobModal,
        BobConfirm: bobConfirm,
        BobReject: bobReject

    }
});



/* INITIALISATION FUNCTIONS */

const ports = {
    "HSE": 8021,
    "ALICE": 8031,
    "AER LINGUS": 8041,
    "BOB": 8051
};
const names = {
    8021: "HSE",
    8031: "ALICE",
    8041: "AER LINGUS",
    8051: "BOB"
}

var isConnected = {
    "HSE": true,
    "ALICE": true,
    "AER LINGUS": true,
    "BOB": true
};



async function init() {
    document.getElementById('cred_date').valueAsDate = new Date();

    initConnectionIDsDict();
    this.al_conn_options = new Array();
    this.loadingModalStatus = new Array();
    this.hse_conn_options = new Array();
    await make_connection_ids();
    updateALProofReqFroms();
    updateHSECredIssueTos();
    initCollapse();
    app.loadingModalStatus.push("Done...");
    app.initLoading = false;

    if (!localStorage.hasOwnProperty("factor") || isConnectionDictEmpty()) {
        localStorage.setItem("factor", 0);
        console.log("initfactor", 0);
        app.revokedIndices = {};
        window.localStorage.setItem("revokedIndices", JSON.stringify({}));
    } else {
        let factor = window.localStorage.getItem("factor");
        let ind = window.localStorage.getItem("revokedIndices");
        console.log(JSON.parse(ind));
        app.revokedIndices = JSON.parse(ind);
        console.log("initfactor", factor);
        app.revokeFactor = factor;
    }

    console.log(JSON.parse(window.localStorage.getItem("revokedIndices")));
    
}

function isConnectionDictEmpty() {
    let entities = Object.values(this.connection_ids);
    for (ent of entities) {
        if (Object.keys(ent).length !== 0) {
            console.log(ent);
            return false;
        }
    }
    return true;
        
}

async function make_connection_ids() {
    let entities = Object.keys(this.connection_ids);
    let promises = [];
    for (let i = 0; i < entities.length; i++) {
        promises.push(getMostRecentConnectionsv2(ports[entities[i]]));
    }
    let promiseRes = await Promise.all(promises);

    for (let i = 0; i < entities.length; i++) {
        for (conn of promiseRes[i]) {
            connection_ids[entities[i]][parseLabel(conn.their_label)] = conn.connection_id;
        }
    }
    console.log("Connection IDs:");
    console.log(connection_ids);
}


function initConnectionIDsDict() {
    this.connection_ids = {
        'ALICE': {},
        'HSE': {},
        'AER LINGUS': {},
        'BOB': {}
    };
}

function initCollapse() {
    var coll = document.getElementsByClassName("collapsible");
    var i;

    for (i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function () {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            var prev = this.previousElementSibling;
            if (content.style.display === "block") {
                content.style.display = "none";
                prev.style.display = "inline";
            } else {
                content.style.display = "block";
                prev.style.display = "none";
            }
        });
    }
}

/* CERTAIN PROGRAMATIC ONCLICKS */

function walletCredClick(element) {
    let el = document.getElementById(element);
    if (el.style.display === "block") {
        el.style.display = "none";
    } else {
        el.style.display = "block";
    }
}

function aliceWalletCredClick() {
    walletCredClick("aliceWalletCollapse");
}

function bobWalletCredClick() {
    walletCredClick("bobWalletCollapse");
}

function hseWalletCredClick() {
    walletCredClick("hseWalletCollapse");
}

function alWalletCredClick() {
    walletCredClick("alWalletCollapse");
}

init();

// removes 'Agent' from end of agent label 
// and toUpperCase
function parseLabel(label) {
    return label.slice(0, -6).toUpperCase();
}

function hseGenerateQR() {
    if (app.hseInviteText == "Click 'Generate Invite!'") {
        app.hseInviteStatus = "No invite to encode";
        return;
    }
    let canvas = document.getElementById("HSEcanvas");
    if (canvas.style.display != "none") {
        canvas.style.display = "none";
        document.getElementById("HSEinviteView").style.display = "inline";
        return;
    }

    let message = app.hseInviteText;
    generateQrCode(canvas, message);

    document.getElementById("HSEinviteView").style.display = "none";
    canvas.style.display = "inline";
 }

 function alGenerateQR() {
    if (app.alInviteText == "Click 'Generate Invite!'") {
        app.alInviteStatus = "No invite to encode";
        return;
    }
    let canvas = document.getElementById("ALcanvas");
    if (canvas.style.display != "none") {
        canvas.style.display = "none";
        document.getElementById("ALinviteView").style.display = "inline";
        return;
    }
    let message = app.alInviteText;
    generateQrCode(canvas, message);
    document.getElementById("ALinviteView").style.display = "none";
    canvas.style.display = "inline";
 }


 function generateQrCode(canvas, message) {
    QRCode.toCanvas(canvas, JSON.stringify(message), function (error) {
        if (error) console.log(error);
        console.log("success");
    });
 }


// Loads invite from HSE or AL into Alice's controller
function setAliceInviteText() {
    this.aliceAcceptInvStatus = "";
    if (this.aliceRadioFrom == "HSE") {
        this.aliceInviteText = this.hseInviteText;
    } else if (this.aliceRadioFrom == "AL") {
        this.aliceInviteText = this.alInviteText;
    } else {
        this.aliceInviteText = null;
    }
}

// Loads invite from HSE or AL into Bob's controller
function setBobInviteText() {
    this.bobAcceptInvStatus = "";
    if (this.bobRadioFrom == "HSE") {
        this.bobInviteText = this.hseInviteText;
    } else if (this.bobRadioFrom == "AL") {
        this.bobInviteText = this.alInviteText;
    } else {
        this.bobInviteText = null;
    }
}

// Accept invite 
async function aliceAcceptInv() {
    this.aliceAcceptInvStatus = "Accepting...";
    let portNum = ports["ALICE"];
    let invitation = this.aliceInviteText;
    let resp = await acceptInvitev3(portNum, invitation);
    if (resp != "ok") {
        this.aliceAcceptInvStatus = "Error";
        this.aliceInviteText = resp;
        return;
    }
    this.aliceAcceptInvStatus = "Accepted!";
}

async function bobAcceptInv() {
    this.bobAcceptInvStatus = "Accepting...";
    let portNum = ports["BOB"];
    let invitation = this.bobInviteText;
    await acceptInvitev3(portNum, invitation);
    this.bobAcceptInvStatus = "Accepted!";
}

// Generic accept invite class
async function acceptInvitev3(portNum, invitation) {
    let data = "";
    try {
        data = await fetch("http://localhost:" + portNum + "/connections/receive-invitation", {
            method: 'post',
            body: JSON.stringify(invitation)
        })
    } catch (err) {
        console.error("acceptinv v3 err", err);
    }
    if (data.status !== 200) {
        console.log(names[portNum] + " agent may not be connected ");

        return "Agent may not be connected or invalid invite.";
    }
    let connection_info = await data.json();

    let name1 = names[portNum]; // alice
    let name2 = parseLabel(connection_info.their_label);    // aer lingus

    // get invitation_key - they match between connections
    let invite_key = connection_info.invitation_key;
    let conn1to2id = connection_info.connection_id;

    // with auto accept it can take a few seconds for the back and forth to complete
    // so we use the invitation_key to see when the connections for both parties
    // have become 'active' (state == active)
    let conn2to1 = await getMostRecentConn(name1, ports[name2], 'active', invite_key);
    while (conn2to1 == "empty") {
        conn2to1PromiseRes = await Promise.all([
            getMostRecentConn(name1, ports[name2], 'active', invite_key),
            timeout(500)
            // TODO: add a refresh limit
        ]);
        conn2to1 = conn2to1PromiseRes[0];
    }

    // update connection IDs dictionary
    this.connection_ids[name1][name2] = conn1to2id;
    this.connection_ids[name2][name1] = conn2to1.connection_id;

    // if Accepting invite from HSE or Aer Lingus 
    // then we need to update its proof request options
    updateALProofReqFroms();
    updateHSECredIssueTos();

    return "ok";

}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function updateHSECredIssueTos() {
    let arr = [];
    for (option in this.connection_ids['HSE']) {
        let entry = {
            name: option,
            conn_id: this.connection_ids['HSE'][option]
        }
        arr.push(entry);
    }
    app.hse_conn_options = arr;
}

function updateALProofReqFroms() {
    let arr = [];
    for (option in this.connection_ids['AER LINGUS']) {
        let entry = {
            name: option,
            conn_id: this.connection_ids['AER LINGUS'][option]
        }
        arr.push(entry);
    }
    app.al_conn_options = arr;
}

function hseIssueCred() {
    this.hseIssueStatus = "Issuing";

    let info_str = "Credential:\n" + app.cred_issue_fullname + 
    "\n" + app.cred_issue_date + 
    "\n" + app.cred_issue_centre + 
    "\n" + app.cred_issue_dose_drop + " doses" +  
    "\n" + app.cred_issue_type_drop;  

    if (app.cred_issue_conn_id == "BOB") {
        showBobQuery(app.hseIssueCredStatus);
        app.bobMoreInfo = info_str;
    }
    else if (app.cred_issue_conn_id == "ALICE") {
        showAliceQuery(app.hseIssueCredStatus);
        app.aliceMoreInfo = info_str;
    } 
}

async function continueHseIssueCred() {
    
    let credResp = await issueCredential(
        app.cred_issue_conn_id,
        app.cred_issue_fullname,
        app.cred_issue_date,
        app.cred_issue_type_drop,
        app.cred_issue_dose_drop,
        app.cred_issue_centre
    );

    if (credResp == -1) {
        app.hseIssueStatus = "Error";
        app.hseCredIssueText = "Error: Not all attributes may have been specified";
    } else {
        app.hseCredIssueText = credResp;
        app.hseIssueStatus = "Issued";
    }
}

// get the most recent active connection portNum knows about
// for each of its connected entities
async function getMostRecentConnectionsv2(portNum) {
    let data = "";
    try {
        let connections = await fetch("http://localhost:" + portNum + "/connections");
        data = await connections.json();
    } catch (err) {
        app.loadingModalStatus.push(names[portNum] + " Agent may not be connected");
        isConnected[names[portNum]] = false;
        console.error(names[portNum] + " Agent may not be connected");
        return [];
    }

    let unique_names = [];
    data.results.forEach(elem => {
        if (elem.their_label !== undefined) {
            let label = parseLabel(elem.their_label);
            if (!unique_names.includes(label)) {
                unique_names.push(label);
            }
        }
    });

    // filter connections to active connections in each name
    let filtereds = [];
    for (const n of unique_names) {
        let filtered = data.results.filter(function (entry) {
            return (entry.state === "active" && parseLabel(entry.their_label) == n);
        });
        filtereds.push(
            filtered.sort(function (a, b) {
                return (b.created_at < a.created_at) ? -1 : ((b.created_at > a.created_at) ? 1 : 0);
            })
        );
    }

    let ret = [];
    for (f of filtereds) {
        ret.push(f[0]); // first of each sublist is the most recent
    }

    return ret;
}

async function getAllIssuedCreds() {
    let ret = [];
    let aliceData = "";

    if (isConnected['ALICE']) {
        try {
            let credentials = await fetch("http://localhost:" + ports["ALICE"] + "/credentials");
            aliceData = await credentials.json();
        } catch (err) {
            console.log(err);
        }
    }

    let bobData = "";
    if (isConnected['BOB']) {
        try {
            let credentials = await fetch("http://localhost:" + ports["BOB"] + '/credentials');
            bobData = await credentials.json();
        } catch (err) {
            console.log(err);
        }
    }

    if (bobData != "") {
        for (cred of bobData.results) {

            let credText = cred.attrs.name + " | " + cred.attrs.vaccination_date + " | " + cred.attrs.vaccination_centre + " | " 
            + cred.attrs.vaccination_type + " | " + cred.attrs.doses + " doses";         
               
            if (app.revokedIndices[parseInt(cred.attrs.factor)] == true) {
                credText += " (R)";
            } 

            ret.push({factor: cred.attrs.factor, cred:credText});
        }
    }

    if (aliceData != "") {
        for (cred of aliceData.results) {
            let credText = cred.attrs.name + " | " + cred.attrs.vaccination_date + " | " + cred.attrs.vaccination_centre + " | " 
            + cred.attrs.vaccination_type + " | " + cred.attrs.doses + " doses";
            
            if (app.revokedIndices[parseInt(cred.attrs.factor)] == true) {
                credText += " (R)";
            } 
            
            ret.push({factor: cred.attrs.factor, cred:credText});
        }
    }
    return ret;

}

// get a list of all active connections
// including multiple to the same entity
// (same as getMostRecentConnectionsv2 but only filter for active connections)
async function getAllConnections(portNum) {
    let data = "";
    try {
        let connections = await fetch("http://localhost:" + portNum + "/connections");
        data = await connections.json();
    } catch (err) {
        app.loadingModalStatus.push(names[portNum] + " Agent may not be connected");
        console.log(names[portNum]);
        isConnected[names[portNum]] = false;
        console.error(names[portNum] + " Agent may not be connected");
        return [];
    }

    // filter connections to active connections in each name
    let filtered = data.results.filter(function (entry) {
        return (entry.state === "active");
    });

    return filtered;
}

// for name from agent at portNum with state
// return single most recent connection between portNum and name
async function getMostRecentConn(name, portNum, reqState, invKey = "") {
    let connections = "";
    try {
        connections = await fetch("http://localhost:" + portNum + "/connections");
    } catch (err) {
        console.error(err);
        return "empty";
    }
    let data = await connections.json();

    // does some behind the scenes thing where request is auto accepted
    // so when we check it may still be in the request state
    // this just combines the steps of receiving a connection invite 
    // and accepting a connection invite which is fine for this purpose
    let filtered = "";
    if (invKey !== "") {
        filtered = data.results.filter(function (entry) {
            return (
                entry.state === reqState
                && entry.their_label.toLowerCase().includes(name.toLowerCase())
                && entry.invitation_key === invKey
            );
        });
    } else {
        filtered = data.results.filter(function (entry) {
            return (
                entry.state === reqState
                && entry.their_label.toLowerCase().includes(name.toLowerCase())
            );
        });
    }
    if (filtered.length == 0) return "empty";

    let mostRecent = filtered[filtered.length - 1];

    return mostRecent;
}

// Could be generic but 
// basically hseIssueCredential as HSE is only controller that needs to issue creds
async function issueCredential(conn_name, fullname, date, type, dose, centre) {
    // assume only HSE can issue
    let portNum = ports["HSE"]; // HSE port number
    // console.log("conn", conn_name);
    // console.log("name", fullname);
    // console.log("date", date);
    // console.log("type", type);
    // console.log("dose", dose);

    // check required data is input
    if (conn_name == null || fullname == null || type == null || dose == null || centre == null) {
        return -1;
    }

    // get HSE-x connection_id
    let currentConnectionInfo = await getMostRecentConn(conn_name, portNum, 'active');

    // update connection_ids dict
    let parsed_name = parseLabel(currentConnectionInfo.their_label);

    // send credential offer
    let cred_def_id = await getCredDefID();
    let hseUserConnID = this.connection_ids['HSE'][parsed_name];
    let credOffer = createCredOffer(hseUserConnID, cred_def_id, fullname, date, type, dose, centre);
    console.log(credOffer);
    let data = await fetch("http://localhost:" + portNum + "/issue-credential/send", {
        method: 'post',
        body: JSON.stringify(credOffer)
    })
    let offerResp = await data.json();
    return credOffer;
}

// Generalised invite creation
async function createHSEInvite() {
    this.hseInviteStatus = "Generating";
    document.getElementById("HSEcanvas").style.display = "none";
    document.getElementById("HSEinviteView").style.display = "inline";
    let inv = await createInvitev2(ports["HSE"]);
    this.hseInvite = inv;
    if (inv.invitation) {
        this.hseInviteText = inv.invitation;
        this.hseInviteStatus = "Generated";
    }
    else {
        this.hseInviteText = inv;
        this.hseInviteStatus = "Error";
    }
}

async function createALInvite() {
    this.alInviteStatus = "Generating";
    document.getElementById("ALcanvas").style.display = "none";
    document.getElementById("ALinviteView").style.display = "inline";
    let inv = await createInvitev2(ports["AER LINGUS"])
    this.alInvite = inv;
    if (inv.invitation) {
        this.alInviteText = inv.invitation;
        this.alInviteStatus = "Generated";
    }
    else {
        this.alInviteText = inv;
        this.alInviteStatus = "Error";
    }
}

async function createInvitev2(port) {
    let url = "http://localhost:" + port + "/connections/create-invitation";
    let resp = ""
    try {
        resp = await fetch(url, {
            method: 'post'
        });
    } catch (err) {
        console.error(names[port] + " agent may not be connected - ", err);
        return "Error: " + names[port] + " agent may not be connected";
    }
    if (resp.status !== 200) { console.log("create inv error: ", res.status); return; }
    let parsed = await resp.json();
    return parsed;
}

// Get credential definition
// (always created by the hse so 8021 port is specified)
async function getCredDefID() {
    let cred_defs = await fetch("http://localhost:8021/credential-definitions/created")
    let parsed = await cred_defs.json();
    return parsed.credential_definition_ids[0];
}

function createCredOffer(connection_id, cred_def_id, name, vaccination_date, vaccination_type, doses, centre) {

    let rand = getRandPrime(1,10000);
    while (app.usedFactors.includes(rand)) {
        rand = getRandPrime(1,10000)
    }
    app.usedFactors.push(rand);
    app.revokedIndices[rand] = false;
    app.revokeFactor *= rand;

    window.localStorage.setItem("factor", app.revokeFactor);
    window.localStorage.setItem("revokedIndices", JSON.stringify(app.revokedIndices));
    console.log(rand);

    let offer = {
        "connection_id": connection_id,
        "cred_def_id": cred_def_id,
        "credential_proposal": {
            "@type": "did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/issue-credential/1.0/credential-preview",
            "attributes": [
                {
                    "name": "name",
                    "value": name
                },
                {
                    "name": "vaccination_date",
                    "value": vaccination_date
                },
                {
                    "name": "vaccination_type",
                    "value": vaccination_type
                },
                {
                    "name": "doses",
                    "value": doses
                },
                {
                    "name": "vaccination_centre",
                    "value": centre
                },
                {
                    "name": "factor",
                    "value": rand.toString()
                }
            ]
        }
    }
    return offer;
}

// Proof Request Accept / Reject for Alice
function showAliceQuery(queryText) {
    app.aliceConfirmQuery = queryText;
    let el = document.getElementById("aliceConfirmation");
    el.style.display = "block";   
}

function hideAliceQuery() {
    this.aliceConfirmQuery = "";
    let el = document.getElementById("aliceConfirmation");
    el.style.display = "none";
}

function aliceConfirm() {
    hideAliceQuery();
    if (app.aliceConfirmQuery == app.alReqProofStatus) requestALProof();
    
    else if (app.aliceConfirmQuery == app.hseIssueCredStatus) continueHseIssueCred();
}

function aliceReject() {
    hideAliceQuery();
    if (app.aliceConfirmQuery == app.alReqProofStatus) app.requestProofStatus = "Rejected";
    else if (app.aliceConfirmQuery == app.hseIssueCredStatus) app.hseIssueStatus = "Rejected";
}

function showBobQuery(queryText) {
    app.bobConfirmQuery = queryText;
    let el = document.getElementById("bobConfirmation");
    el.style.display = "block";
}

function hideBobQuery() {
    this.bobConfirmQuery = "";
    let el = document.getElementById("bobConfirmation");
    el.style.display = "none";
}

function bobConfirm() {
    hideBobQuery();
    if (app.bobConfirmQuery == app.alReqProofStatus) requestALProof();
    else if (app.bobConfirmQuery == app.hseIssueCredStatus) continueHseIssueCred();
}

function bobReject() {
    hideBobQuery();
    if (app.bobConfirmQuery == app.alReqProofStatus) app.requestProofStatus = "Rejected";
    else if (app.bobConfirmQuery == app.hseIssueCredStatus) app.hseIssueStatus = "Rejected";
}

async function handleProofReq() {
    // Figure out requester from connection id
    let al_conn_ids = Object.values(connection_ids['AER LINGUS']);
    let index = al_conn_ids.indexOf(app.proof_req_conn_id);
    let req_entity = Object.keys(connection_ids['AER LINGUS'])[index];

    // construct the proof
    this.requestProofStatus = "Requested";
    let cred_def_id = await getCredDefID();
    let proofReq = constructProof(
        app.proof_req_conn_id,
        app.proof_req_fullname_check,
        app.proof_req_date_check,
        app.proof_req_type_check,
        app.proof_req_centre_check,
        app.zkpRadio,
        app.proof_req_pred_drop,
        app.proof_req_doses_drop,
        cred_def_id);

    // Create info on what is being exposed to send to holder of credential
    let exposing = Object.entries(proofReq.proof_request.requested_attributes);
    let exposed_names = [];
    for (attr of exposing) {
        if (attr[1].name != "self_attested_thing") exposed_names.push(attr[1].name);
    }
    exposed_names.unshift

    let verifying = Object.entries(proofReq.proof_request.requested_predicates);
    let verify_names = [];
    for (pred of verifying) {
        verify_names.push(pred[1].name + " " + pred[1].p_type + " " + pred[1].p_value);
    }

    let info_str = "Exposing:\n" + ((exposed_names.length == 0) ? "Nothing" : exposed_names.toString()) + 
    '\nand verifying in zero knowledge:\n' + ((verify_names.length == 0) ? "Nothing" : verify_names.toString());

    // show it to whoever it is being issued to
    if (req_entity == "BOB") {
        showBobQuery(app.alReqProofStatus);
        app.bobMoreInfo = info_str;
    } else if (req_entity == "ALICE") {
        showAliceQuery(app.alReqProofStatus);
        app.aliceMoreInfo = info_str;
    }
}

// actually send the proof request once it has been confirmed by holder
async function requestALProof() {
    app.alVerifyPrfStatus = "";
    app.requestProofStatus = "Confirmed";

    // get cred def id
    let cred_def_id = await getCredDefID();


    let proofReq = constructProof(
        app.proof_req_conn_id,
        app.proof_req_fullname_check,
        app.proof_req_date_check,
        app.proof_req_type_check,
        app.proof_req_centre_check,
        app.zkpRadio,
        app.proof_req_pred_drop,
        app.proof_req_doses_drop,
        cred_def_id);

    if (proofReq == -1) {
        app.ALProofReqText = "Error: From field not specified";
        app.requestProofStatus = "Error";
        return;
    }
    app.ALProofReqText = proofReq;

    let portNum = ports['AER LINGUS'];
    let resp = await fetch("http://localhost:" + portNum + "/present-proof/send-request", {
        method: 'post',
        body: JSON.stringify(proofReq)
    });

    let proofReqResp = await resp.json();
    app.requestProofStatus = "Response Received";
    app.ALProofRespText = proofReqResp;

}

async function alVerifyProof() {
    this.alVerifyPrfStatus = "Verifying";
    let portNum = ports['AER LINGUS'];
    console.log(app.ALProofRespText);
    let pres_exch_id = this.ALProofRespText.presentation_exchange_id;
    let record = await getMostRecentPresentation(portNum, pres_exch_id);

    if (record == -1) {
        console.log("No presentations to verify");
        this.ALProofVerificationText = "No presentation. Request proof first!";
        this.alVerifyPrfStatus = "Error";
        return;
    }
    while (record.state !== "presentation_received") {
        recordPromises = await Promise.all([
            getMostRecentPresentation(portNum, pres_exch_id),
            timeout(500)
        ]);
        record = recordPromises[0];
    }

    let verifyResp = "";
    let verified = false;
    let verify = "";
    try {
        verifyResp = await fetch("http://localhost:" + portNum + "/present-proof/records/" + pres_exch_id + "/verify-presentation", {
            method: 'post'
        });

        if (verifyResp.ok) {

            this.alVerifyPrfStatus = "Verified";
            verify = await verifyResp.json();
            let factor = parseInt(verify.presentation.requested_proof.revealed_attrs['0_factor_uuid'].raw);
            console.log(factor);

            console.log("mod", app.revokeFactor % factor);
            if (app.revokeFactor % factor != 0) {
                this.alVerifyPrfStatus = "Failed Verification";
                verified = false;
                this.ALProofVerificationText = "Credential Revoked"
                return;
            } 

            verified = true;
            this.ALProofVerificationText = verifyResp;
        } else {
            this.alVerifyPrfStatus = "Failed Verification";
            verified = false;
            this.ALProofVerificationText = "Verfication Failed"
            return;
        }
    } catch (err) {
        console.error("verifyResp error", err);
    }

    // verify = await verifyResp.json();
    let revealed_attrs = verify.presentation.requested_proof.revealed_attrs;
    let parsed_attrs = "";
    for (attr in revealed_attrs) {
        parsed_attrs += attr + ": " + revealed_attrs[attr]['raw'] + '\n';
    }
    let req_preds = Object.entries(this.ALProofReqText.proof_request.requested_predicates);
    if (req_preds.length !== 0) {
        let zkpPreds = this.ALProofReqText.proof_request.requested_predicates['0_dose_uuid'];
        parsed_attrs += "and " + zkpPreds.name + " " + zkpPreds.p_type + " " + zkpPreds.p_value + "\n";
    } else {
        parsed_attrs += "No dose amount information verified\n";
    }

    parsed_attrs += "-----------------------------\nProof Verified with the above information revealed";
    this.ALProofVerificationText = parsed_attrs;

    // post proofReq to /present-proof/send-request
    // take the 'presentation_exchange_id' from this and post that to
    // /present-proof/records/{pres_exch_id}/verify-presentation
    // 200 = ok | error = not verified
}

async function getMostRecentPresentation(portNum, pres_exch_id) {
    let resp = await fetch("http://localhost:" + portNum + "/present-proof/records");
    let records = await resp.json();
    let filtered = records.results.filter(function (entry) {
        return (entry.presentation_exchange_id === pres_exch_id)
    });
    if (filtered.length == 0) return -1;
    return filtered[0];
}

function dummyProof(conn_id, cred_def_id) {
    let proofReq = {};
    proofReq['connection_id'] = conn_id;
    proofReq['proof_request'] = {
        name: "Proof of Vaccination",
        version: "1.0",
        requested_attributes: {},
        requested_predicates: {}
    };
    proofReq.proof_request.requested_attributes['0_name_uuid'] = {
        name: "name",
        restrictions: [
            {
                cred_def_id: cred_def_id
            }
        ]
    };
    proofReq.proof_request.requested_attributes['0_date_uuid'] = {
        name: "vaccination_date",
        restrictions: [
            {
                cred_def_id: cred_def_id
            }
        ]
    };
    proofReq.proof_request.requested_attributes['0_type_uuid'] = {
        name: "vaccination_type",
        restrictions: [
            {
                cred_def_id: cred_def_id
            }
        ]
    };
    proofReq.proof_request.requested_attributes['0_centre_uuid'] = {
        name: "vaccination_centre",
        restrictions: [
            {
                cred_def_id: cred_def_id
            }
        ]
    };
    proofReq.proof_request.requested_attributes['0_doses_uuid'] = {
        name: "doses",
        restrictions: [
            {
                cred_def_id: cred_def_id
            }
        ]
    };
    return proofReq;
}

// construct proof JSON to send
function constructProof(
    conn_id,
    fullname_check,
    date_check,
    type_check,
    centre_check,
    zkp_check,
    pred_drop,
    doses_drop,
    cred_def_id) {

    if (conn_id == null) return -1;

    let proofReq = {};
    proofReq['connection_id'] = conn_id;
    proofReq['proof_request'] = {
        name: "Proof of Vaccination",
        version: "1.0",
        requested_attributes: {},
        requested_predicates: {}
    };

    if (fullname_check) proofReq.proof_request.requested_attributes['0_name_uuid'] = {
        name: "name",
        restrictions: [
            {
                cred_def_id: cred_def_id
            }
        ]
    };

    if (date_check) proofReq.proof_request.requested_attributes['0_date_uuid'] = {
        name: "vaccination_date",
        restrictions: [
            {
                cred_def_id: cred_def_id
            }
        ]
    };

    if (type_check) proofReq.proof_request.requested_attributes['0_type_uuid'] = {
        name: "vaccination_type",
        restrictions: [
            {
                cred_def_id: cred_def_id
            }
        ]
    };

    if (centre_check) proofReq.proof_request.requested_attributes['0_centre_uuid'] = {
        name: "vaccination_centre",
        restrictions: [
            {
                cred_def_id: cred_def_id
            }
        ]
    };

    // always get the factor
    proofReq.proof_request.requested_attributes['0_factor_uuid'] = {
        name: "factor",
        restrictions: [
            {
                cred_def_id: cred_def_id
            }
        ]
    };

    proofReq.proof_request.requested_attributes["0_self_attested_thing_uuid"] = {
        "name": "self_attested_thing"
    }

    // if Zero-Knowledge Proof needed for doses
    if (zkp_check == "true") {
        proofReq.proof_request.requested_predicates['0_dose_uuid'] = {
            name: "doses",
            p_type: pred_drop,
            p_value: parseInt(doses_drop),
            restrictions: [
                {
                    cred_def_id: cred_def_id
                }
            ]
        };
    }

    return proofReq;
}

async function requestProof() {
    // initially do HSE-Alice request
    let hseAliceConnID = this.connection_ids['HSE']['ALICE'];
    let cred_def_id = await getCredDefID();

    let req = createProofRequest(hseAliceConnID, cred_def_id, ">=", 5);
    // send request to Alice (for now) from HSE (for now)
    let toParse = await fetch("http://localhost:8021/present-proof/send-request", {
        method: "post",
        body: JSON.stringify(req)
    });
    let reqResp = await toParse.json();
    console.log("pres_xch_id:", reqResp.presentation_exchange_id);
}

// num_doses :: Int
function createProofRequest(connection_id, cred_def_id, comp_type, num_doses) {
    let request = {
        "connection_id": connection_id,
        "proof_request": {
            "name": "Proof of Vaccination",
            "version": "1.0",
            "requested_attributes": {
                "0_name_uuid": {
                    "name": "name",
                    "restrictions": [
                        {
                            "cred_def_id": cred_def_id
                        }
                    ]
                },
                "0_date_uuid": {
                    "name": "vaccination_date",
                    "restrictions": [
                        {
                            "cred_def_id": cred_def_id
                        }
                    ]
                },
                "0_type_uuid": {
                    "name": "vaccination_type",
                    "restrictions": [
                        {
                            "cred_def_id": cred_def_id
                        }
                    ]
                },
                "0_self_attested_thing_uuid": {
                    "name": "self_attested_thing"
                }
            },
            "requested_predicates": {
                "0_doses_uuid": {
                    "name": "doses",
                    "p_type": comp_type,
                    "p_value": num_doses,
                    "restrictions": [
                        {
                            "cred_def_id": cred_def_id
                        }
                    ]
                }
            }
        }
    }
    return request;
}

async function getWalletInfo(portNum) {
    let resp = await fetch("http://localhost:" + portNum + "/wallet/did");
    let dids = await resp.json();
    let didArr = [];
    for (did of dids.results) {
        if (did.public == "true") {
            didArr.push("DID: " + "did:sov:" + did.did);
            didArr.push("Public: " + did.public);
            didArr.push(("-------------------------"));
        }
    }

    let conns = await getAllConnections(portNum);

    connArr = [];
    let i = 1;
    for (conn of conns) {
        connArr.push("(" + i + ")");

        let str = "Label: " + conn.their_label + "\n";
        connArr.push(str);
        str = "Conn ID: " + conn.connection_id + "\n";
        connArr.push(str);
        connArr.push("Pairwise DIDs:\n")
        str = "My DID: did:sov:" + conn.my_did + "\n";
        connArr.push(str);
        str = "Their DID: did:sov:" + conn.their_did + "\n";
        connArr.push(str);
        connArr.push("-------------------------");

        i++;
    }

    let credArr = [];
    resp = await fetch("http://localhost:" + portNum + "/credentials");
    // we can assume any creds issued are from the HSE in this scenario
    // using /ledger/did-endpoint with the id thrown back in the call
    // we cannn get the origin but it's unncecessary here
    let creds = await resp.json();
    // let credArr = creds.results;

    // only show unique credentials
    for (cred of creds.results) {
        let parsed = parseObjArray(Object.entries(cred.attrs)).sort();
        if (!arrayInArray(credArr, parsed)) credArr.push(parsed);
    }
    return { didArr, connArr, credArr };
}

/* Helper functions and appearance code */

function toggleScrollbar() {
    adjustColumnOverflow("hidden");
}

function adjustColumnOverflow(state) {
    let cols = document.getElementsByClassName("column");
    for (let i = 0; i < cols.length; i++) {
        cols[i].style.overflow = state;
        if (state == "auto") cols[i].style["overflow-y"] = "overlay";
    }
}

function closeAliceModal() {
    this.showAliceModal = false;
    adjustColumnOverflow("auto");
}

function closeHSEModal() {
    this.showHSEModal = false;
    adjustColumnOverflow("auto");
}

function closeBobModal() {
    this.showBobModal = false;
    adjustColumnOverflow("auto");
}

function closeALModal() {
    this.showALModal = false;
    adjustColumnOverflow("auto");
}

async function showRevokeModal() {
    app.revokeModalShown = true;
    toggleScrollbar();
    let portNum = ports['HSE'];
    let info = await getAllIssuedCreds();
    app.hseIssuedCreds = info;

}

function closeRevokeModal() {
    app.revokeModalShown = false;
    app.revokeUpdate = "";
    adjustColumnOverflow("auto");
}

function selectCred(cred) {

    let localRevoked = JSON.parse(window.localStorage.getItem("revokedIndices"));
    // if (app.hseRevokedCreds.includes(cred.factor)) {
    if (localRevoked[cred.factor] == true) {

        let index = app.hseRevokedCreds.indexOf(cred.factor);
        app.hseRevokedCreds.splice(index, 1);
        app.revokeUpdate = "Unrevoked";

        app.revokedIndices[cred.factor] = false;
        window.localStorage.setItem("revokedIndices", JSON.stringify(app.revokedIndices));

        let intfactor = parseInt(cred.factor);
        app.revokeFactor *= intfactor;
        // localStorage.setItem(app.revokeFactor, false);
    } else if (localRevoked[cred.factor] == false) {
        app.hseRevokedCreds.push(cred.factor);
        app.revokeUpdate = "Revoked";

        app.revokedIndices[cred.factor] = true;
        window.localStorage.setItem("revokedIndices", JSON.stringify(app.revokedIndices));

        let intfactor = parseInt(cred.factor);
        app.revokeFactor /= intfactor;
        // localStorage.setItem(app.revokeFactor, true)
    } else {
        console.log("oops");
    }
    localStorage.setItem("factor", app.revokeFactor);
    console.log("New factor", app.revokeFactor);
}

async function showHSEModal() {
    this.showHSEModal = true;
    toggleScrollbar();
    let portNum = ports['HSE'];
    let info = await getWalletInfo(portNum);
    
    if (info.didArr.length != 0) app.hseDIDs = info.didArr;
    if (info.connArr.length != 0) app.hseConns = info.connArr;
    if (info.credArr.length != 0) app.hseCredentialsText = info.credArr;
}

async function showAliceModal() {
    this.showAliceModal = true;
    toggleScrollbar();
    let portNum = ports['ALICE'];
    let info = await getWalletInfo(portNum);

    if (info.didArr.length != 0) app.aliceDIDs = info.didArr;
    if (info.connArr.length != 0) app.aliceConns = info.connArr;
    if (info.credArr.length != 0) app.aliceCredentialsText = info.credArr;
}

async function showBobModal() {
    this.showBobModal = true;
    toggleScrollbar();
    let portNum = ports['BOB'];
    let info = await getWalletInfo(portNum);

    if (info.didArr.length != 0) app.bobDIDs = info.didArr;
    if (info.connArr.length != 0) app.bobConns = info.connArr;
    if (info.credArr.length != 0) app.bobCredentialsText = info.credArr;
}

async function showALModal() {
    this.showALModal = true;
    toggleScrollbar();
    let portNum = ports['AER LINGUS'];
    let info = await getWalletInfo(portNum);

    if (info.didArr.length != 0) app.alDIDs = info.didArr;
    if (info.connArr.length != 0) app.alConns = info.connArr;
    if (info.credArr.length != 0) app.alCredentialsText = info.credArr;
}

function arrayInArray(arr, elem) {
    let item_as_string = JSON.stringify(elem);

    var contains = arr.some(function (el) {
        return JSON.stringify(el) === item_as_string;
    });
    return contains;
}

// parse 2 element arrays in form ["vaccination_date", "2021-02-22"]
// into string "Date: 2021-02-22" 
function parseObjArray(arr) {
    let ret = [];
    for (obj of arr) {
        let key = obj[0];
        let val = obj[1];
        let new_key = key;
        if (key.includes('_')) {
            new_key = key.split('_')[1];
        }
        new_key = new_key[0].toUpperCase() + new_key.substring(1);
        let string = new_key + ": " + val;
        ret.push(string);
    }
    return ret;
}

const getPrimes = (min, max) => {
    const result = Array(max + 1)
      .fill(0)
      .map((_, i) => i);
    for (let i = 2; i <= Math.sqrt(max + 1); i++) {
      for (let j = i ** 2; j < max + 1; j += i) delete result[j];
    }
    return Object.values(result.slice(min));
  };
  
  const getRandNum = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
  };
  
  const getRandPrime = (min, max) => {
    const primes = getPrimes(min, max);
    return primes[getRandNum(0, primes.length - 1)];
  };