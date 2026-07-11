RECONNECT-US CORE VERSION 2

Upload index.html to a GitHub folder called reconnectus-core.
Replace the current Firestore rules with firestore.rules and publish them.

Your existing Super Admin record remains in Firebase, so you should not need to claim ownership again.

Version 2 includes dashboard totals, user roles, app permissions, last-sign-in recording and the secure app launcher.

New Firebase Authentication accounts are still created in Firebase Console. The Core then manages their role, status and app access.


SECURE LOGIN UPDATE
This version does not remember a Firebase login after the page is refreshed,
reopened, or opened in another tab. The email address and password must be
entered again each time.


SECURE LOGIN V3
This version forcibly signs out any remembered Firebase session on page load.
Opening or refreshing the page always returns to the email-and-password login screen.

After replacing index.html on GitHub Pages, use Ctrl+F5 once to bypass the old cached page.
