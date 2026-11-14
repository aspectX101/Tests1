# Spotify on the dashboard

The card reads the Spotify desktop application's Windows media session (GSMTC). No Spotify account connection, API token, web request or listening-history storage is used. Browser Spotify sessions are not selected: their source app is the browser, which could also expose unrelated media.

The helper runs only while the home dashboard is open and polls every two seconds in one hidden Windows PowerShell 5.1 process. Metadata, JPEG/PNG thumbnails (up to 1 MiB), timeline and reported control capabilities are passed as JSON. Playback commands are restricted to play/pause, previous and next; Windows/Spotify can decline them. Closing the dashboard or app stops the watcher. An unavailable Windows media API and an absent Spotify session have separate messages. Album art and duration depend on what Spotify exposes to Windows.

The script is packaged outside ASAR in resources/media/spotify-session.ps1. Node tests cover process boundaries, framing, validation and lifecycle. The Windows smoke test parses the script and checks a read-only JSON status request; it does not test a signed-in Spotify session. The real desktop session still needs an interactive Windows test.

API reference: https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssession
