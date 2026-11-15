/*
 * voting.h - Online Voting and Election Management System
 * Shared header: structures, constants, global data and prototypes.
 *
 *   voting.c    - global data, admin, election control, voting, messages
 *   voter.c     - voter registration and search
 *   candidate.c - candidate registration and search
 *   results.c   - vote counting, winner and tie detection
 *   main.c      - console menu (not used in the web version)
 *
 * Standard C99. Works with gcc (console) and emcc (WebAssembly).
 */
#ifndef VOTING_H
#define VOTING_H

/* When compiled with Emscripten, EXPORT keeps a function visible to JavaScript.
   With gcc it expands to nothing. */
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT
#endif

/* ---------- Limits ---------- */
#define MAX_VOTERS         100
#define MAX_CANDIDATES     20
#define NAME_LEN           50
#define MIN_AGE            18
#define MAX_AGE            120
#define FIRST_VOTER_ID     1001
#define FIRST_CANDIDATE_ID 101
#define ADMIN_PIN          1234

/* ---------- Election states ---------- */
#define STATE_SETUP  0   /* adding candidates, election not started */
#define STATE_OPEN   1   /* voting allowed */
#define STATE_CLOSED 2   /* voting finished, winner declared */

/* ---------- Status codes returned to the caller ---------- */
#define STATUS_OK                    1
#define ERR_UNDERAGE                -1
#define ERR_FULL                    -2
#define ERR_INVALID_NAME            -3
#define ERR_INVALID_AGE             -4
#define ERR_VOTER_NOT_FOUND         -5
#define ERR_ALREADY_VOTED           -6
#define ERR_CANDIDATE_NOT_FOUND     -7
#define ERR_ELECTION_NOT_OPEN       -8
#define ERR_WRONG_STATE             -9
#define ERR_NOT_ADMIN              -10
#define ERR_WRONG_PIN              -11
#define ERR_DUPLICATE_CANDIDATE    -12
#define ERR_NOT_ENOUGH_CANDIDATES  -13

/* ---------- Winner results ---------- */
#define RESULT_NO_VOTES -1
#define RESULT_TIE      -2

/* ---------- Structures ---------- */
struct Voter {
    int  id;
    char name[NAME_LEN];
    int  age;
    int  hasVoted;          /* 0 = not voted, 1 = voted */
};

struct Candidate {
    int  id;
    char name[NAME_LEN];
    char party[NAME_LEN];
    int  votes;
};

/* ---------- Global data (defined once in voting.c) ---------- */
extern struct Voter     voters[MAX_VOTERS];
extern struct Candidate candidates[MAX_CANDIDATES];
extern int voterCount;
extern int candidateCount;
extern int nextVoterId;
extern int nextCandidateId;
extern int electionState;
extern int adminLoggedIn;

/* ---------- voting.c ---------- */
int is_valid_name(const char *name);            /* helper, not exported */
EXPORT void init_system(void);
EXPORT int  admin_login(int pin);
EXPORT void admin_logout(void);
EXPORT int  is_admin(void);
EXPORT int  start_election(void);
EXPORT int  end_election(void);
EXPORT int  can_vote(int voterId);
EXPORT int  cast_vote(int voterId, int candidateId);
EXPORT int  get_election_state(void);
EXPORT const char *get_status_message(int code);
EXPORT const char *get_state_name(void);

/* ---------- voter.c ---------- */
EXPORT int         register_voter(const char *name, int age);
EXPORT int         find_voter(int voterId);
EXPORT int         get_voter_count(void);
EXPORT int         get_voter_id(int index);
EXPORT const char *get_voter_name(int index);
EXPORT int         get_voter_age(int index);
EXPORT int         get_voter_has_voted(int index);

/* ---------- candidate.c ---------- */
int find_candidate_by_name(const char *name);   /* helper, not exported */
EXPORT int         register_candidate(const char *name, const char *party);
EXPORT int         find_candidate(int candidateId);
EXPORT int         get_candidate_count(void);
EXPORT int         get_candidate_id(int index);
EXPORT const char *get_candidate_name(int index);
EXPORT const char *get_candidate_party(int index);
EXPORT int         get_candidate_votes(int index);

/* ---------- results.c ---------- */
EXPORT int get_total_votes(void);
EXPORT int get_turnout_percent(void);
EXPORT int get_vote_percent(int index);
EXPORT int get_max_votes(void);
EXPORT int get_tie_count(void);
EXPORT int get_winner_index(void);
EXPORT int is_leader(int index);

#endif
