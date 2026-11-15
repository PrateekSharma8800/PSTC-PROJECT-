/*
 * main.c - Menu-driven console version (original synopsis style).
 * Uses the same logic as the web app from voting.c, voter.c, candidate.c, results.c.
 *
 * Build: gcc -std=c99 -Wall -o voting_console main.c voting.c voter.c candidate.c results.c
 */
#include <stdio.h>
#include "voting.h"

/* Clears leftover characters after invalid input. */
void clear_input(void)
{
    int ch;
    while ((ch = getchar()) != '\n' && ch != EOF) {
    }
}

int read_int(const char *prompt)
{
    int value;
    printf("%s", prompt);
    while (scanf("%d", &value) != 1) {
        if (feof(stdin)) {
            return -1;
        }
        clear_input();
        printf("Invalid number. %s", prompt);
    }
    clear_input();
    return value;
}

void read_text(const char *prompt, char *text)
{
    printf("%s", prompt);
    if (scanf(" %49[^\n]", text) != 1) {
        text[0] = '\0';
    }
    clear_input();
}

void show_message(int code)
{
    printf(">> %s\n", get_status_message(code));
}

void show_candidates(void)
{
    int i;
    int count = get_candidate_count();

    if (count == 0) {
        printf("No candidates registered.\n");
        return;
    }
    printf("\n%-6s %-20s %-15s %-6s %s\n", "ID", "Name", "Party", "Votes", "Share");
    for (i = 0; i < count; i++) {
        printf("%-6d %-20s %-15s %-6d %d%%\n",
               get_candidate_id(i), get_candidate_name(i),
               get_candidate_party(i), get_candidate_votes(i),
               get_vote_percent(i));
    }
    printf("Total votes: %d | Turnout: %d%%\n",
           get_total_votes(), get_turnout_percent());
}

void show_voters(void)
{
    int i;
    int count = get_voter_count();

    if (count == 0) {
        printf("No voters registered.\n");
        return;
    }
    printf("\n%-6s %-20s %-4s %s\n", "ID", "Name", "Age", "Status");
    for (i = 0; i < count; i++) {
        printf("%-6d %-20s %-4d %s\n",
               get_voter_id(i), get_voter_name(i), get_voter_age(i),
               get_voter_has_voted(i) ? "Voted" : "Not voted");
    }
}

void show_result(void)
{
    int i;
    int winner = get_winner_index();

    if (winner == RESULT_NO_VOTES) {
        printf("No votes were cast.\n");
    } else if (winner == RESULT_TIE) {
        printf("TIE between %d candidates with %d votes each:\n",
               get_tie_count(), get_max_votes());
        for (i = 0; i < get_candidate_count(); i++) {
            if (is_leader(i)) {
                printf("  - %s (%s)\n", get_candidate_name(i), get_candidate_party(i));
            }
        }
    } else {
        printf("WINNER: %s (%s) with %d votes\n",
               get_candidate_name(winner), get_candidate_party(winner),
               get_candidate_votes(winner));
    }
}

int main(void)
{
    int choice;
    int result;
    int age;
    int voterId;
    int candidateId;
    char name[NAME_LEN];
    char party[NAME_LEN];

    init_system();

    do {
        printf("\n===== ONLINE VOTING SYSTEM [%s]%s =====\n",
               get_state_name(), is_admin() ? " [ADMIN]" : "");
        printf("1. Register Voter\n");
        printf("2. Admin Login\n");
        printf("3. Register Candidate (admin)\n");
        printf("4. Start Election (admin)\n");
        printf("5. Cast Vote\n");
        printf("6. View Candidates / Live Count\n");
        printf("7. View Voters\n");
        printf("8. End Election & Declare Result (admin)\n");
        printf("9. Show Result\n");
        printf("0. Exit\n");
        choice = read_int("Enter choice: ");

        switch (choice) {
            case 1:
                read_text("Voter name: ", name);
                age = read_int("Age: ");
                result = register_voter(name, age);
                if (result > 0) {
                    printf(">> Registered. Your Voter ID is %d\n", result);
                } else {
                    show_message(result);
                }
                break;

            case 2:
                show_message(admin_login(read_int("Admin PIN: ")));
                break;

            case 3:
                read_text("Candidate name: ", name);
                read_text("Party: ", party);
                result = register_candidate(name, party);
                if (result > 0) {
                    printf(">> Candidate registered with ID %d\n", result);
                } else {
                    show_message(result);
                }
                break;

            case 4:
                show_message(start_election());
                break;

            case 5:
                show_candidates();
                voterId = read_int("Your Voter ID: ");
                candidateId = read_int("Candidate ID: ");
                result = cast_vote(voterId, candidateId);
                if (result == STATUS_OK) {
                    printf(">> Vote recorded. Thank you!\n");
                } else {
                    show_message(result);
                }
                break;

            case 6:
                show_candidates();
                break;

            case 7:
                show_voters();
                break;

            case 8:
                result = end_election();
                show_message(result);
                if (result == STATUS_OK) {
                    show_result();
                }
                break;

            case 9:
                show_result();
                break;

            case 0:
            case -1:
                printf("Goodbye!\n");
                choice = 0;
                break;

            default:
                printf("Invalid choice.\n");
        }
    } while (choice != 0);

    return 0;
}
