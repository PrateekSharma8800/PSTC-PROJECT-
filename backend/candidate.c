/*
 * candidate.c - Candidate registration and linear search.
 */
#include <string.h>
#include "voting.h"

/* Linear search for a candidate by name (to stop duplicates). */
int find_candidate_by_name(const char *name)
{
    int i;
    for (i = 0; i < candidateCount; i++) {
        if (strcmp(candidates[i].name, name) == 0) {
            return i;
        }
    }
    return -1;
}

/* Admin only, before the election starts.
   Returns the new Candidate ID (positive) or an error code (negative). */
int register_candidate(const char *name, const char *party)
{
    if (!adminLoggedIn) {
        return ERR_NOT_ADMIN;
    }
    if (electionState != STATE_SETUP) {
        return ERR_WRONG_STATE;
    }
    if (!is_valid_name(name) || !is_valid_name(party)) {
        return ERR_INVALID_NAME;
    }
    if (find_candidate_by_name(name) != -1) {
        return ERR_DUPLICATE_CANDIDATE;
    }
    if (candidateCount >= MAX_CANDIDATES) {
        return ERR_FULL;
    }

    candidates[candidateCount].id = nextCandidateId;
    strcpy(candidates[candidateCount].name, name);
    strcpy(candidates[candidateCount].party, party);
    candidates[candidateCount].votes = 0;

    candidateCount++;
    nextCandidateId++;                  /* next candidate gets a new unique ID */
    return candidates[candidateCount - 1].id;
}

/* Linear search: returns the array index of the candidate, or -1 if not found. */
int find_candidate(int candidateId)
{
    int i;
    for (i = 0; i < candidateCount; i++) {
        if (candidates[i].id == candidateId) {
            return i;
        }
    }
    return -1;
}

int get_candidate_count(void)
{
    return candidateCount;
}

/* ---------- Data access by array index ---------- */

int get_candidate_id(int index)
{
    if (index < 0 || index >= candidateCount) return -1;
    return candidates[index].id;
}

const char *get_candidate_name(int index)
{
    if (index < 0 || index >= candidateCount) return "";
    return candidates[index].name;
}

const char *get_candidate_party(int index)
{
    if (index < 0 || index >= candidateCount) return "";
    return candidates[index].party;
}

int get_candidate_votes(int index)
{
    if (index < 0 || index >= candidateCount) return -1;
    return candidates[index].votes;
}
