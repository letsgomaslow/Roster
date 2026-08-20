# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase2-auth-ui.spec.ts >> Auth UI and onboarding entry >> getting-started never renders the authenticated checklist when Clerk JS fails to load
- Location: e2e/phase2-auth-ui.spec.ts:47:7

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /Users/kesh/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,BoundaryEventDispatchTracksNodeRemoval,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate,RenderDocument,OptimizationHints --enable-features=CDPScreenshotNewSurface --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --enable-automation --disable-infobars --disable-search-engine-choice-screen --disable-sync --enable-unsafe-swiftshader --headless --hide-scrollbars --mute-audio --blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4 --no-sandbox --user-data-dir=/var/folders/qh/yn8xsz9d7hn2pzzzpkdjbnph0000gn/T/playwright_chromiumdev_profile-BIyg6K --remote-debugging-pipe --no-startup-window
<launched> pid=12949
[pid=12949][err] [0416/005729.249279:ERROR:base/power_monitor/thermal_state_observer_mac.mm:140] ThermalStateObserverMac unable to register to power notifications. Result: 9
[pid=12949][err] [0416/005729.271553:ERROR:net/dns/dns_config_service_posix.cc:138] DNS config watch failed to start.
[pid=12949][err] [0416/005729.279059:WARNING:net/dns/dns_config_service_posix.cc:197] Failed to read DnsConfig.
[pid=12949][err] [0416/005729.288611:FATAL:base/apple/mach_port_rendezvous_mac.cc:159] Check failed: kr == KERN_SUCCESS. bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer.12949: Permission denied (1100)
Call log:
  - <launching> /Users/kesh/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,BoundaryEventDispatchTracksNodeRemoval,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate,RenderDocument,OptimizationHints --enable-features=CDPScreenshotNewSurface --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --enable-automation --disable-infobars --disable-search-engine-choice-screen --disable-sync --enable-unsafe-swiftshader --headless --hide-scrollbars --mute-audio --blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4 --no-sandbox --user-data-dir=/var/folders/qh/yn8xsz9d7hn2pzzzpkdjbnph0000gn/T/playwright_chromiumdev_profile-BIyg6K --remote-debugging-pipe --no-startup-window
  - <launched> pid=12949
  - [pid=12949][err] [0416/005729.249279:ERROR:base/power_monitor/thermal_state_observer_mac.mm:140] ThermalStateObserverMac unable to register to power notifications. Result: 9
  - [pid=12949][err] [0416/005729.271553:ERROR:net/dns/dns_config_service_posix.cc:138] DNS config watch failed to start.
  - [pid=12949][err] [0416/005729.279059:WARNING:net/dns/dns_config_service_posix.cc:197] Failed to read DnsConfig.
  - [pid=12949][err] [0416/005729.288611:FATAL:base/apple/mach_port_rendezvous_mac.cc:159] Check failed: kr == KERN_SUCCESS. bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer.12949: Permission denied (1100)
  - [pid=12949] <gracefully close start>
  - [pid=12949] <kill>
  - [pid=12949] <will force kill>
  - [pid=12949] exception while trying to kill process: Error: kill EPERM
  - [pid=12949] <process did exit: exitCode=null, signal=SIGTRAP>
  - [pid=12949] starting temporary directories cleanup
  - [pid=12949] finished temporary directories cleanup
  - [pid=12949] <gracefully close end>

```