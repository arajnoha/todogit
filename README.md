### TodoGit the tray icon with number of active tasks waiting for you (=MRs) on GitLab

![Screenshot of TodoGit](screenshot.png)

- Generate an access token at your gitlab instance
- paste it with the URL of your gitlab
- TodoGit will check your TODOs or assigned MRs every minute
- Quickly open the gitlab GUI form the dropdown menu

Credentials are stored in json within this application bundle and hence, unaccessable from the outside. The app itself doesn't perform any http requests other than to your specified server.
