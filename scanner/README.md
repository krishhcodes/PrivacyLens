# Local scanner

Reads the camera, microphone, location and notification rules that Chrome, Edge or Brave have saved for **every site** on this computer, including **when each rule last changed**, and uploads them to the backend. The extension can't see either of those.

```sh
python scan.py --dry-run                    # print what it finds, upload nothing
python scan.py                              # upload to http://127.0.0.1:8000
python scan.py --api https://<backend>.onrender.com
python scan.py --browser edge               # limit to one browser
```
Windows: use `python` or `py` instead of `python3`. It needs no installs (standard library only).

- **Read-only.** To block or reset a permission, use the extension.
- **Only runs on the machine it's run on.** It reads `.../User Data/<Profile>/Preferences`, an internal browser file. Unknown entries are skipped, not guessed, and if a browser changes that format the scanner reports nothing rather than wrong data.
- **What gets uploaded:** observations are sent with `source: "local_scan"`, `page_state: "not_checked"` and the browser's own `setting_changed_at`.
