/*
 * voting.c - Global data, admin login, election control, casting votes
 * and status messages.
 */
#include <string.h>
#include "voting.h"

/* ---------- Global data: arrays of structures ---------- */
struct Voter     voters[MAX_VOTERS];
struct Candidate candidates[MAX_CANDIDATES];

int voterCount      = 0;
int candidateCount  = 0;
int nextVoterId     = FIRST_VOTER_ID;
int nextCandidateId = FIRST_CANDIDATE_ID;
int electionState   = STATE_SETUP;
int adminLoggedIn   = 0;

/* A name is valid if it is not empty, not too long and not only spaces. */
int is_valid_name(const char *name)
{
    int i;
    int length;

    if (name == NULL) {
        return 0;
    }
    length = (int)strlen(name);
    if (length == 0 || length >= NAME_LEN) {
        return 0;
    }
    for (i = 0; i < length; i++) {
        if (name[i] != ' ') {
            return 1;       /* found a real character */
        }
    }
    return 0;
}

/* ================= Setup and admin ================= */

void init_system(void)
{
    voterCount      = 0;
    candidateCount  = 0;
    nextVoterId     = FIRST_VOTER_ID;
    nextCandidateId = FIRST_CANDIDATE_ID;
    electionState   = STATE_SETUP;
    adminLoggedIn   = 0;
}

int admin_login(int pin)
{
    if (pin == ADMIN_PIN) {
        adminLoggedIn = 1;
        return STATUS_OK;
    }
    return ERR_WRONG_PIN;
}

void admin_logout(void)
{
    adminLoggedIn = 0;
}

int is_admin(void)
{
    return adminLoggedIn;
}

/* ================= Election control ================= */

int start_election(void)
{
    if (!adminLoggedIn) {
        return ERR_NOT_ADMIN;
    }
    if (electionState != STATE_SETUP) {
        return ERR_WRONG_STATE;
    }
    if (candidateCount < 2) {
        return ERR_NOT_ENOUGH_CANDIDATES;
    }
    electionState = STATE_OPEN;
    return STATUS_OK;
}

int end_election(void)
{
    if (!adminLoggedIn) {
        return ERR_NOT_ADMIN;
    }
    if (electionState != STATE_OPEN) {
        return ERR_WRONG_STATE;
    }
    electionState = STATE_CLOSED;
    return STATUS_OK;
}

int get_election_state(void)
{
    return electionState;
}

/* ================= Voting ================= */

/* Checks whether a voter is allowed to vote right now.
   Used before showing the ballot and again inside cast_vote. */
int can_vote(int voterId)
{
    int v;

    if (electionState != STATE_OPEN) {
        return ERR_ELECTION_NOT_OPEN;
    }
    v = find_voter(voterId);
    if (v == -1) {
        return ERR_VOTER_NOT_FOUND;
    }
    if (voters[v].hasVoted == 1) {
        return ERR_ALREADY_VOTED;       /* duplicate voting prevented */
    }
    return STATUS_OK;
}

int cast_vote(int voterId, int candidateId)
{
    int v;
    int c;
    int check = can_vote(voterId);

    if (check != STATUS_OK) {
        return check;
    }
    v = find_voter(voterId);

    c = find_candidate(candidateId);
    if (c == -1) {
        return ERR_CANDIDATE_NOT_FOUND;
    }

    candidates[c].votes++;              /* live vote counting */
    voters[v].hasVoted = 1;
    return STATUS_OK;
}

/* ================= Messages (switch-case) ================= */

const char *get_status_message(int code)
{
    switch (code) {
        case STATUS_OK:                 return "Success.";
        case ERR_UNDERAGE:              return "Voter must be at least 18 years old.";
        case ERR_FULL:                  return "Registration limit reached.";
        case ERR_INVALID_NAME:          return "Please enter a valid name.";
        case ERR_INVALID_AGE:           return "Please enter a valid age.";
        case ERR_VOTER_NOT_FOUND:       return "Voter ID not found.";
        case ERR_ALREADY_VOTED:         return "This voter has already voted.";
        case ERR_CANDIDATE_NOT_FOUND:   return "Candidate not found.";
        case ERR_ELECTION_NOT_OPEN:     return "Voting is not open right now.";
        case ERR_WRONG_STATE:           return "This action is not allowed at the current election stage.";
        case ERR_NOT_ADMIN:             return "Admin login required.";
        case ERR_WRONG_PIN:             return "Incorrect admin PIN.";
        case ERR_DUPLICATE_CANDIDATE:   return "A candidate with this name already exists.";
        case ERR_NOT_ENOUGH_CANDIDATES: return "At least 2 candidates are needed to start.";
        default:                        return "Unknown error.";
    }
}

const char *get_state_name(void)
{
    switch (electionState) {
        case STATE_SETUP:  return "Not Started";
        case STATE_OPEN:   return "Voting Open";
        case STATE_CLOSED: return "Closed";
        default:           return "Unknown";
    }
}
