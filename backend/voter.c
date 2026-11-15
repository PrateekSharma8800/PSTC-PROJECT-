/*
 * voter.c - Voter registration (with age verification) and linear search.
 */
#include <string.h>
#include "voting.h"

/* Returns the new Voter ID (positive) or an error code (negative). */
int register_voter(const char *name, int age)
{
    if (electionState == STATE_CLOSED) {
        return ERR_WRONG_STATE;
    }
    if (!is_valid_name(name)) {
        return ERR_INVALID_NAME;
    }
    if (age < 0 || age > MAX_AGE) {
        return ERR_INVALID_AGE;
    }
    if (age < MIN_AGE) {
        return ERR_UNDERAGE;            /* age verification */
    }
    if (voterCount >= MAX_VOTERS) {
        return ERR_FULL;
    }

    voters[voterCount].id = nextVoterId;
    strcpy(voters[voterCount].name, name);
    voters[voterCount].age = age;
    voters[voterCount].hasVoted = 0;

    voterCount++;
    nextVoterId++;                      /* next voter gets a new unique ID */
    return voters[voterCount - 1].id;
}

/* Linear search: returns the array index of the voter, or -1 if not found. */
int find_voter(int voterId)
{
    int i;
    for (i = 0; i < voterCount; i++) {
        if (voters[i].id == voterId) {
            return i;
        }
    }
    return -1;
}

int get_voter_count(void)
{
    return voterCount;
}

/* ---------- Data access by array index ---------- */

int get_voter_id(int index)
{
    if (index < 0 || index >= voterCount) return -1;
    return voters[index].id;
}

const char *get_voter_name(int index)
{
    if (index < 0 || index >= voterCount) return "";
    return voters[index].name;
}

int get_voter_age(int index)
{
    if (index < 0 || index >= voterCount) return -1;
    return voters[index].age;
}

int get_voter_has_voted(int index)
{
    if (index < 0 || index >= voterCount) return -1;
    return voters[index].hasVoted;
}
