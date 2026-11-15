/*
 * app.js - User interface only.
 * Every decision (age check, duplicate vote, counting, winner, tie)
 * is made by the C code in voting.c, compiled to WebAssembly.
 * This file only reads forms, calls C functions and shows the results.
 */

/* Values copied from voting.h (must match). */
var STATUS_OK = 1;
var STATE_SETUP = 0, STATE_OPEN = 1, STATE_CLOSED = 2;
var RESULT_NO_VOTES = -1, RESULT_TIE = -2;

/* C functions, filled in by bindC() once WebAssembly has loaded. */
var C = {};

/* Emscripten reads this global object when voting.js loads. */
var Module = {
  onRuntimeInitialized: function () { startApp(); },
  onAbort: function () { engineMissing(); }
};

/* Browsers block loading .wasm files from file:// pages. */
if (location.protocol === "file:") {
  window.addEventListener("DOMContentLoaded", function () { engineMissing(); });
}

function bindC() {
  var n = "number", s = "string";
  var signatures = {
    init_system: [null, []],
    admin_login: [n, [n]],
    admin_logout: [null, []],
    is_admin: [n, []],
    register_voter: [n, [s, n]],
    register_candidate: [n, [s, s]],
    find_voter: [n, [n]],
    can_vote: [n, [n]],
    start_election: [n, []],
    end_election: [n, []],
    cast_vote: [n, [n, n]],
    get_election_state: [n, []],
    get_voter_count: [n, []],
    get_candidate_count: [n, []],
    get_total_votes: [n, []],
    get_turnout_percent: [n, []],
    get_voter_id: [n, [n]],
    get_voter_name: [s, [n]],
    get_voter_age: [n, [n]],
    get_voter_has_voted: [n, [n]],
    get_candidate_id: [n, [n]],
    get_candidate_name: [s, [n]],
    get_candidate_party: [s, [n]],
    get_candidate_votes: [n, [n]],
    get_vote_percent: [n, [n]],
    get_max_votes: [n, []],
    get_winner_index: [n, []],
    get_tie_count: [n, []],
    is_leader: [n, [n]],
    get_status_message: [s, [n]],
    get_state_name: [s, []]
  };
  for (var name in signatures) {
    C[name] = Module.cwrap(name, signatures[name][0], signatures[name][1]);
  }
}

/* ============ Saving in the browser ============
 * WebAssembly memory is cleared on refresh, so we save a list of the
 * successful actions and replay them through the C functions on load.
 * The data itself is always rebuilt by C. */
var STORE_KEY = "evote_actions_v1";
var actionLog = [];

function loadLog() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch (e) { return []; }
}
function saveLog() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(actionLog)); } catch (e) { /* storage unavailable */ }
}
function record(action) {
  actionLog.push(action);
  saveLog();
}
function replay() {
  C.init_system();
  actionLog.forEach(function (a) {
    switch (a[0]) {
      case "voter":     C.register_voter(a[1], a[2]); break;
      case "login":     C.admin_login(a[1]); break;
      case "logout":    C.admin_logout(); break;
      case "candidate": C.register_candidate(a[1], a[2]); break;
      case "start":     C.start_election(); break;
      case "end":       C.end_election(); break;
      case "vote":      C.cast_vote(a[1], a[2]); break;
    }
  });
  C.admin_logout(); /* admin must log in again after a refresh */
}

/* ============ Small helpers ============ */
function $(id) { return document.getElementById(id); }

function esc(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function initials(name) {
  var parts = name.trim().split(/\s+/);
  var first = parts[0] ? parts[0][0] : "";
  var last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function toast(message, type) {
  var el = document.createElement("div");
  el.className = "toast " + (type || "");
  el.textContent = message;
  $("toasts").appendChild(el);
  setTimeout(function () { el.remove(); }, 3500);
}

/* Shows a message from C for a status code. */
function showStatus(code, successText) {
  if (code === STATUS_OK || code > 0) {
    toast(successText || C.get_status_message(STATUS_OK), "success");
  } else {
    toast(C.get_status_message(code), "error");
  }
}

/* Custom confirm dialog (no browser popups). */
function confirmBox(title, html, okText, onOk) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = html;
  $("modalOk").textContent = okText;
  $("modal").classList.remove("hidden");
  $("modalOk").onclick = function () { closeModal(); onOk(); };
  $("modalOk").focus();
}
function closeModal() { $("modal").classList.add("hidden"); }

/* Reads every candidate from C into a plain list for display. */
function getCandidates() {
  var list = [];
  var count = C.get_candidate_count();
  for (var i = 0; i < count; i++) {
    list.push({
      index: i,
      id: C.get_candidate_id(i),
      name: C.get_candidate_name(i),
      party: C.get_candidate_party(i),
      votes: C.get_candidate_votes(i),
      percent: C.get_vote_percent(i),
      leader: C.is_leader(i) === 1
    });
  }
  return list;
}

/* ============ Navigation ============ */
var PAGES = {
  dashboard: ["Dashboard", "Overview of the current election"],
  register: ["Voter Registration", "Register eligible voters and issue Voter IDs"],
  candidates: ["Candidates", "Candidates contesting this election"],
  vote: ["Cast Vote", "Verify your Voter ID and choose a candidate"],
  results: ["Results", "Live vote count and winner declaration"],
  admin: ["Admin Panel", "Control the election"]
};

function showView(name) {
  document.querySelectorAll(".view").forEach(function (v) { v.classList.remove("active"); });
  document.querySelectorAll(".nav-item").forEach(function (b) {
    b.classList.toggle("active", b.dataset.view === name);
  });
  $("view-" + name).classList.add("active");
  $("pageTitle").textContent = PAGES[name][0];
  $("pageSub").textContent = PAGES[name][1];
  closeMenu();
  window.scrollTo(0, 0);
}

function closeMenu() {
  $("sidebar").classList.remove("open");
  $("scrim").classList.remove("show");
}

/* ============ Rendering ============ */
function render() {
  renderHeader();
  renderDashboard();
  renderVoters();
  renderCandidates();
  renderVoteAvailability();
  renderResults();
  renderAdmin();
}

function renderHeader() {
  var badge = $("stateBadge");
  badge.textContent = C.get_state_name();
  badge.className = "badge state-" + C.get_election_state();
  $("adminBadge").classList.toggle("hidden", C.is_admin() !== 1);
}

function renderDashboard() {
  var turnout = C.get_turnout_percent();
  $("statVoters").textContent = C.get_voter_count();
  $("statCandidates").textContent = C.get_candidate_count();
  $("statVotes").textContent = C.get_total_votes();
  $("statTurnout").textContent = turnout + "%";
  $("turnoutBar").style.width = turnout + "%";

  var state = C.get_election_state();
  document.querySelectorAll("#stepper li").forEach(function (li) {
    var step = Number(li.dataset.step);
    li.classList.toggle("done", step < state || (state === STATE_CLOSED && step === STATE_CLOSED));
    li.classList.toggle("current", step === state && state !== STATE_CLOSED);
  });

  var list = getCandidates().sort(function (a, b) { return b.votes - a.votes; }).slice(0, 5);
  var max = Math.max(1, C.get_max_votes());
  if (list.length === 0) {
    $("dashStandings").innerHTML = '<p class="muted">No candidates yet. Add them from the Candidates page (admin).</p>';
    return;
  }
  $("dashStandings").innerHTML = list.map(function (c) {
    return '<div class="mini-row"><span class="name">' + esc(c.name) + '</span>' +
      '<span class="bar-track"><span class="bar-fill" style="display:block;width:' + (c.votes / max * 100) + '%"></span></span>' +
      '<span class="v">' + c.votes + '</span></div>';
  }).join("");
}

function renderVoters() {
  var count = C.get_voter_count();
  $("voterCountLabel").textContent = count + (count === 1 ? " voter" : " voters");
  if (count === 0) {
    $("voterTable").innerHTML = '<tr class="empty-row"><td colspan="4">No voters registered yet.</td></tr>';
    return;
  }
  var rows = "";
  for (var i = 0; i < count; i++) {
    var voted = C.get_voter_has_voted(i) === 1;
    rows += "<tr><td><strong>" + C.get_voter_id(i) + "</strong></td><td>" + esc(C.get_voter_name(i)) +
      "</td><td>" + C.get_voter_age(i) + "</td><td>" +
      (voted ? '<span class="pill pill-yes">Voted</span>' : '<span class="pill pill-no">Not voted</span>') +
      "</td></tr>";
  }
  $("voterTable").innerHTML = rows;
}

function renderCandidates() {
  var state = C.get_election_state();
  var canAdd = C.is_admin() === 1 && state === STATE_SETUP;
  $("candidateFormCard").classList.toggle("hidden", !canAdd);

  var lock = $("candidateLock");
  if (canAdd) {
    lock.classList.add("hidden");
  } else {
    lock.classList.remove("hidden");
    lock.className = "notice info";
    lock.textContent = state === STATE_SETUP
      ? "Log in from the Admin Panel to add candidates."
      : "Candidate registration is closed because the election has started.";
  }

  var list = getCandidates();
  if (list.length === 0) {
    $("candidateGrid").innerHTML = '<div class="empty-state">No candidates registered yet.</div>';
    return;
  }
  $("candidateGrid").innerHTML = list.map(function (c) {
    return '<div class="cand-card">' +
      '<div class="cand-top"><div class="avatar">' + esc(initials(c.name)) + '</div>' +
      '<div><div class="cand-name">' + esc(c.name) + '</div><div class="cand-party">' + esc(c.party) + '</div></div></div>' +
      '<div class="cand-foot"><span>ID ' + c.id + '</span><span><span class="cand-votes">' + c.votes + '</span> votes</span></div>' +
      '</div>';
  }).join("");
}

function renderVoteAvailability() {
  var state = C.get_election_state();
  var open = state === STATE_OPEN;
  $("voteFlow").classList.toggle("hidden", !open);
  $("voteClosed").classList.toggle("hidden", open);
  $("voteClosed").textContent = state === STATE_SETUP
    ? "Voting has not started yet. The admin will open the election."
    : "Voting has ended. See the Results page for the winner.";
  if (!open) resetVoteFlow();
}

function renderResults() {
  var state = C.get_election_state();
  var winner = C.get_winner_index();
  var list = getCandidates();
  var total = C.get_total_votes();
  var banner = $("resultBanner");
  var trophy = '<div class="big-icon"><svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg></div>';
  var kicker, headline, sub;

  if (state === STATE_SETUP) {
    kicker = "Not started"; headline = "Results will appear once voting begins"; sub = list.length + " candidates registered";
  } else if (winner === RESULT_NO_VOTES) {
    kicker = state === STATE_CLOSED ? "Election closed" : "Live count";
    headline = "No votes cast yet"; sub = "Waiting for voters";
  } else if (winner === RESULT_TIE) {
    var tied = list.filter(function (c) { return c.leader; }).map(function (c) { return c.name; });
    kicker = state === STATE_CLOSED ? "Final result · Tie" : "Live count · Tie";
    headline = "Tie between " + tied.join(" and ");
    sub = C.get_tie_count() + " candidates with " + C.get_max_votes() + " votes each";
  } else {
    var w = list[winner];
    kicker = state === STATE_CLOSED ? "Winner declared" : "Currently leading";
    headline = w.name;
    sub = w.party + " · " + w.votes + " votes (" + w.percent + "%)";
  }
  banner.innerHTML = trophy + '<div><div class="kicker">' + esc(kicker) + '</div><div class="headline">' +
    esc(headline) + '</div><div class="sub">' + esc(sub) + '</div></div>';

  $("resultTotal").textContent = total + " total votes";
  var sorted = list.slice().sort(function (a, b) { return b.votes - a.votes; });
  var max = Math.max(1, C.get_max_votes());

  if (sorted.length === 0) {
    $("resultBars").innerHTML = '<p class="muted">No candidates registered.</p>';
    $("resultTable").innerHTML = '<tr class="empty-row"><td colspan="6">No candidates registered.</td></tr>';
    return;
  }

  $("resultBars").innerHTML = sorted.map(function (c) {
    var tag = c.leader ? '<span class="lead-tag">' + (winner === RESULT_TIE ? "Tied" : (state === STATE_CLOSED ? "Winner" : "Leading")) + '</span>' : "";
    return '<div class="bar-row' + (c.leader ? " leader" : "") + '" data-tip="' +
      esc(c.name + " (" + c.party + "): " + c.votes + " votes, " + c.percent + "%") + '">' +
      '<div class="bar-label">' + esc(c.name) + tag + '<small>' + esc(c.party) + '</small></div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + (c.votes / max * 100) + '%"></div></div>' +
      '<div class="bar-value"><strong>' + c.votes + '</strong> · ' + c.percent + '%</div></div>';
  }).join("");

  /* Rank: candidates with equal votes share a rank. */
  var rank = 0, lastVotes = -1;
  $("resultTable").innerHTML = sorted.map(function (c, i) {
    if (c.votes !== lastVotes) { rank = i + 1; lastVotes = c.votes; }
    return "<tr><td>" + rank + "</td><td>" + c.id + "</td><td><strong>" + esc(c.name) + "</strong></td><td>" +
      esc(c.party) + '</td><td class="num">' + c.votes + '</td><td class="num">' + c.percent + "%</td></tr>";
  }).join("");
}

function renderAdmin() {
  var admin = C.is_admin() === 1;
  var state = C.get_election_state();
  $("adminLogin").classList.toggle("hidden", admin);
  $("adminPanel").classList.toggle("hidden", !admin);
  $("startBtn").disabled = state !== STATE_SETUP;
  $("endBtn").disabled = state !== STATE_OPEN;
  var texts = [
    "The election is in setup. Add at least 2 candidates, then start the election.",
    "Voting is open. End the election to declare the final result.",
    "The election is closed and the result has been declared."
  ];
  $("adminStateText").textContent = texts[state];
}

/* ============ Voting flow ============ */
var currentVoterId = null;
var selectedCandidate = null;

function resetVoteFlow() {
  currentVoterId = null;
  selectedCandidate = null;
  $("voteStep1").classList.remove("hidden");
  $("voteStep2").classList.add("hidden");
  $("voteDone").classList.add("hidden");
  $("verifyForm").reset();
}

function showBallot() {
  var list = getCandidates();
  $("ballot").innerHTML = list.map(function (c) {
    return '<button type="button" class="ballot-option" data-id="' + c.id + '">' +
      '<div class="avatar">' + esc(initials(c.name)) + '</div>' +
      '<div><div class="cand-name">' + esc(c.name) + '</div><div class="cand-party">' + esc(c.party) + '</div></div>' +
      '<span class="check"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg></span></button>';
  }).join("");
  $("reviewVote").disabled = true;
}

/* ============ Event handlers ============ */
function setupEvents() {
  document.querySelectorAll(".nav-item").forEach(function (btn) {
    btn.addEventListener("click", function () { showView(btn.dataset.view); });
  });
  document.querySelectorAll("[data-goto]").forEach(function (btn) {
    btn.addEventListener("click", function () { showView(btn.dataset.goto); });
  });
  $("menuBtn").addEventListener("click", function () {
    $("sidebar").classList.add("open");
    $("scrim").classList.add("show");
  });
  $("scrim").addEventListener("click", closeMenu);
  $("modalCancel").addEventListener("click", closeModal);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  /* Register voter */
  $("voterForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("voterName").value.trim();
    var age = parseInt($("voterAge").value, 10);
    if (isNaN(age)) age = -1;

    var result = C.register_voter(name, age);
    if (result > 0) {
      record(["voter", name, age]);
      $("voterIdCard").classList.remove("empty");
      $("voterIdCard").innerHTML = '<div class="id-card"><div class="label">Voter ID</div>' +
        '<div class="id">' + result + '</div><div class="row"><span>' + esc(name) + '</span><span>Age ' + age + '</span></div></div>';
      $("voterForm").reset();
      toast("Voter registered. ID: " + result, "success");
      render();
    } else {
      showStatus(result);
    }
  });

  /* Add candidate */
  $("candidateForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("candName").value.trim();
    var party = $("candParty").value.trim();
    var result = C.register_candidate(name, party);
    if (result > 0) {
      record(["candidate", name, party]);
      $("candidateForm").reset();
      $("candName").focus();
      toast(name + " added with ID " + result, "success");
      render();
    } else {
      showStatus(result);
    }
  });

  /* Voting step 1: verify voter */
  $("verifyForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var id = parseInt($("verifyId").value, 10);
    var check = C.can_vote(id);
    if (check !== STATUS_OK) {
      showStatus(check);
      return;
    }
    currentVoterId = id;
    $("voterGreet").textContent = "Welcome, " + C.get_voter_name(C.find_voter(id)) + " (Voter ID " + id + "). Select one candidate.";
    showBallot();
    $("voteStep1").classList.add("hidden");
    $("voteStep2").classList.remove("hidden");
  });

  /* Voting step 2: choose candidate */
  $("ballot").addEventListener("click", function (e) {
    var option = e.target.closest(".ballot-option");
    if (!option) return;
    document.querySelectorAll(".ballot-option").forEach(function (o) { o.classList.remove("selected"); });
    option.classList.add("selected");
    selectedCandidate = Number(option.dataset.id);
    $("reviewVote").disabled = false;
  });

  $("changeVoter").addEventListener("click", resetVoteFlow);
  $("nextVoter").addEventListener("click", resetVoteFlow);

  /* Confirmation, then C records the vote */
  $("reviewVote").addEventListener("click", function () {
    var c = getCandidates().filter(function (x) { return x.id === selectedCandidate; })[0];
    if (!c) return;
    confirmBox("Confirm your vote",
      "<p>You are voting for:</p>" +
      '<div class="confirm-cand"><div class="avatar">' + esc(initials(c.name)) + '</div><div><div class="cand-name">' +
      esc(c.name) + '</div><div class="cand-party">' + esc(c.party) + "</div></div></div>" +
      "<p>A vote cannot be changed once submitted.</p>",
      "Submit Vote",
      function () {
        var result = C.cast_vote(currentVoterId, selectedCandidate);
        if (result === STATUS_OK) {
          record(["vote", currentVoterId, selectedCandidate]);
          $("voteStep2").classList.add("hidden");
          $("voteDone").classList.remove("hidden");
          render();
        } else {
          showStatus(result);
          resetVoteFlow();
        }
      });
  });

  /* Admin */
  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var pin = parseInt($("adminPin").value, 10);
    var result = C.admin_login(isNaN(pin) ? -1 : pin);
    $("loginForm").reset();
    if (result === STATUS_OK) {
      record(["login", pin]);
      toast("Logged in as admin", "success");
      render();
    } else {
      showStatus(result);
    }
  });

  $("logoutBtn").addEventListener("click", function () {
    C.admin_logout();
    record(["logout"]);
    toast("Logged out");
    render();
  });

  $("startBtn").addEventListener("click", function () {
    confirmBox("Start the election?",
      "<p>Candidate registration will close and voting will open.</p>", "Start Election",
      function () {
        var result = C.start_election();
        if (result === STATUS_OK) record(["start"]);
        showStatus(result, "Election started. Voting is now open.");
        render();
      });
  });

  $("endBtn").addEventListener("click", function () {
    confirmBox("End the election?",
      "<p>Voting will close permanently and the final result will be declared.</p>", "End Election",
      function () {
        var result = C.end_election();
        if (result === STATUS_OK) {
          record(["end"]);
          showStatus(result, "Election closed. Result declared.");
          render();
          showView("results");
        } else {
          showStatus(result);
        }
      });
  });

  $("resetBtn").addEventListener("click", function () {
    confirmBox("Reset all data?",
      "<p>All voters, candidates and votes will be deleted. This cannot be undone.</p>", "Reset",
      function () {
        actionLog = [];
        saveLog();
        C.init_system();
        $("voterIdCard").className = "card voter-id-card empty";
        $("voterIdCard").innerHTML = '<div class="id-placeholder">The new Voter ID will appear here after registration.</div>';
        toast("All data cleared");
        render();
      });
  });

  /* Hover tooltip on result bars */
  var tip = $("tooltip");
  $("resultBars").addEventListener("mousemove", function (e) {
    var row = e.target.closest(".bar-row");
    if (!row) { tip.classList.add("hidden"); return; }
    tip.textContent = row.dataset.tip;
    tip.classList.remove("hidden");
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + "px";
    tip.style.top = (e.clientY + 14) + "px";
  });
  $("resultBars").addEventListener("mouseleave", function () { tip.classList.add("hidden"); });
}

/* ============ Start ============ */
function startApp() {
  bindC();
  actionLog = loadLog();
  replay();
  setupEvents();
  render();
  document.querySelector(".engine-chip").classList.add("ready");
  $("loader").classList.add("hidden");
}

/* Called if voting.js could not be loaded. */
function engineMissing() {
  var text = location.protocol === "file:"
    ? "Open this page through a local server: run <code>python3 -m http.server 8000</code> in the project folder, then visit <code>localhost:8000/frontend/</code>."
    : "The C engine (voting.js / voting.wasm) was not found. Run <code>./build.sh</code> first.";
  document.querySelector(".spinner").style.display = "none";
  $("loaderText").innerHTML = text;
}
