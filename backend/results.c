/*
 * results.c - Live vote counting, maximum finding, winner and tie detection.
 */
#include "voting.h"

int get_total_votes(void)
{
    int i;
    int total = 0;
    for (i = 0; i < candidateCount; i++) {
        total = total + candidates[i].votes;
    }
    return total;
}

/* Percentage of registered voters who have voted. */
int get_turnout_percent(void)
{
    if (voterCount == 0) {
        return 0;
    }
    return (get_total_votes() * 100) / voterCount;
}

/* Share of total votes for one candidate. */
int get_vote_percent(int index)
{
    int total = get_total_votes();
    if (index < 0 || index >= candidateCount || total == 0) return 0;
    return (candidates[index].votes * 100) / total;
}

/* Maximum finding: highest vote count among all candidates. */
int get_max_votes(void)
{
    int i;
    int max = 0;
    for (i = 0; i < candidateCount; i++) {
        if (candidates[i].votes > max) {
            max = candidates[i].votes;
        }
    }
    return max;
}

/* Number of candidates sharing the highest vote count. */
int get_tie_count(void)
{
    int i;
    int count = 0;
    int max = get_max_votes();

    if (max == 0) {
        return 0;
    }
    for (i = 0; i < candidateCount; i++) {
        if (candidates[i].votes == max) {
            count++;
        }
    }
    return count;
}

/* Returns the winner's index, RESULT_NO_VOTES or RESULT_TIE. */
int get_winner_index(void)
{
    int i;
    int max = get_max_votes();

    if (max == 0) {
        return RESULT_NO_VOTES;
    }
    if (get_tie_count() > 1) {
        return RESULT_TIE;
    }
    for (i = 0; i < candidateCount; i++) {
        if (candidates[i].votes == max) {
            return i;
        }
    }
    return RESULT_NO_VOTES;
}

/* 1 if this candidate has the highest votes (used to list tied leaders). */
int is_leader(int index)
{
    int max = get_max_votes();
    if (index < 0 || index >= candidateCount || max == 0) return 0;
    return candidates[index].votes == max;
}
