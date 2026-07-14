//
//  PraxoWindowManager.swift
//  Praxo
//
//  Opens the Praxo course library as a regular window from the menu-bar app.
//  Wire-up: call PraxoWindowManager.shared.showLibrary() from the menu bar
//  panel (e.g. a "Courses" button in CompanionPanelView) or from
//  applicationDidFinishLaunching for library-first startup.
//

import AppKit
import SwiftUI

@MainActor
final class PraxoWindowManager {
    static let shared = PraxoWindowManager()

    private var window: NSWindow?

    func showLibrary() {
        if let window {
            window.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }

        let hosting = NSHostingController(rootView: PraxoCourseLibraryView())
        let window = NSWindow(contentViewController: hosting)
        window.title = "Praxo"
        window.setContentSize(NSSize(width: 860, height: 600))
        window.styleMask = [.titled, .closable, .miniaturizable, .resizable]
        window.center()
        window.isReleasedWhenClosed = false
        self.window = window

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}
