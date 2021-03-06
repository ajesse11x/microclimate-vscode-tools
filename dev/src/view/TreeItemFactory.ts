/*******************************************************************************
 * Copyright (c) 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/


import * as vscode from "vscode";

import Project from "../microclimate/project/Project";
import Connection from "../microclimate/connection/Connection";
import Translator from "../constants/strings/translator";
import Resources from "../constants/Resources";
import StringNamespaces from "../constants/strings/StringNamespaces";
import Log from "../Logger";
import Commands from "../constants/Commands";
import ConnectionManager from "../microclimate/connection/ConnectionManager";

/**
 * All of these values must match the viewItem regexes in package.nls.json
 */
enum TreeContextValues {
    // base
    BASE = "ext.mc",
    NO_PROJECTS = "noProjects",

    // Connection
    // connection can only be one of these 3
    NO_CONNECTIONS = "noConnections",
    CONN_CONNECTED = "connection.connected",
    CONN_DISCONNECTED = "connection",

    // Project
    PROJ_BASE = "project",

    // (en|dis)abled are mutex
    PROJ_ENABLED = "enabled",
    PROJ_DISABLED = "disabled",

    // debuggable, started both imply enabled
    PROJ_DEBUGGABLE = "debuggable",
    PROJ_STARTED = "started",

    // auto build statuses are mutex
    PROJ_AUTOBUILD_ON = "autoBuildOn",
    PROJ_AUTOBUILD_OFF = "autoBuildOff"
}

export type MicroclimateTreeItem = Connection | Project | vscode.TreeItem;

namespace TreeItemFactory {
    export function getRootTreeItems(): MicroclimateTreeItem[] {
        if (ConnectionManager.instance.connections.length === 0) {
            return [{
                label: "No connections (Click to connect)",
                iconPath: Resources.getIconPaths(Resources.Icons.Microclimate),
                contextValue: buildContextValue([TreeContextValues.NO_CONNECTIONS]),
                command: {
                    command: Commands.NEW_DEFAULT_CONNECTION,
                    title: "",
                },
            }];
        }
        return ConnectionManager.instance.connections;
    }

    export function toTreeItem(resource: Project | Connection): vscode.TreeItem {
        if (resource instanceof Project) {
            return getProjectTI(resource);
        }
        else if (resource instanceof Connection) {
            return getConnectionTI(resource);
        }
        else {
            // darn you, theia
            const errMsg = "Unexpected object cannot be converted to TreeItem";
            Log.e(errMsg, resource);
            throw new Error(errMsg);
        }
    }

    export function getConnectionChildren(connection: Connection): MicroclimateTreeItem[] {
       if (connection.isConnected) {
            if (connection.projects.length > 0) {
                return connection.projects.sort((a, b) => a.name.localeCompare(b.name));
            }
            else {
                return [{
                    label: Translator.t(StringNamespaces.TREEVIEW, "noProjectsLabel"),
                    iconPath: Resources.getIconPaths(Resources.Icons.Error),
                    tooltip: "Click here to create a new project",
                    contextValue: buildContextValue([TreeContextValues.NO_PROJECTS]),
                    command: {
                        command: Commands.CREATE_MC_PROJECT,
                        title: "",
                        arguments: [connection]
                    }
                }];
            }
        }
        else {
            return [{
                label: Translator.t(StringNamespaces.TREEVIEW, "disconnectedConnectionLabel"),
                iconPath: Resources.getIconPaths(Resources.Icons.Disconnected),
                contextValue: "nothing",        // anything truthy works
                // Consider putting refresh as the command on this item
            }];
        }
    }
}

function getConnectionTI(connection: Connection): vscode.TreeItem {
    return {
        label: Translator.t(StringNamespaces.TREEVIEW, "connectionLabel", { uri: connection.mcUri }),
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        tooltip: `${connection.versionStr} • ${connection.workspacePath.fsPath}`,
        contextValue: getConnectionContext(connection),
        iconPath: Resources.getIconPaths(Resources.Icons.Microclimate),
        // command:
    };
}

function getProjectTI(project: Project): vscode.TreeItem {
    return {
        label: Translator.t(StringNamespaces.TREEVIEW, "projectLabel", { projectName: project.name, state: project.state.toString() }),
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        tooltip: project.state.toString(),
        contextValue: getProjectContext(project),
        iconPath: project.type.icon,
        // command run on single-click (or double click - depends on a user setting - https://github.com/Microsoft/vscode/issues/39601)
        command: {
            command: Commands.VSC_REVEAL_EXPLORER,
            title: "",
            arguments: [project.localPath]
        },
    };
}

function getConnectionContext(connection: Connection): string {
    let contextValue: TreeContextValues;
    if (connection.isConnected) {
        contextValue = TreeContextValues.CONN_CONNECTED;
    }
    else {
        contextValue = TreeContextValues.CONN_DISCONNECTED;
    }
    return buildContextValue([contextValue]);
}

function getProjectContext(project: Project): string {
    const contextValues: TreeContextValues[] = [ TreeContextValues.PROJ_BASE ];

    if (project.state.isEnabled) {
        contextValues.push(TreeContextValues.PROJ_ENABLED);
        if (project.state.isStarted) {
            contextValues.push(TreeContextValues.PROJ_STARTED);
        }
        if (project.state.isDebuggable) {
            contextValues.push(TreeContextValues.PROJ_DEBUGGABLE);
        }
    }
    else {
        contextValues.push(TreeContextValues.PROJ_DISABLED);
    }

    if (project.autoBuildEnabled) {
        contextValues.push(TreeContextValues.PROJ_AUTOBUILD_ON);
    }
    else {
        contextValues.push(TreeContextValues.PROJ_AUTOBUILD_OFF);
    }

    // The final result will look like eg: "ext.mc.project.enabled.autoBuildOn"
    return buildContextValue(contextValues);
}


// const CONTEXT_SEPARATOR = ".";
function buildContextValue(subvalues: string[]): string {
    return [ TreeContextValues.BASE, ...subvalues].join(".");
}

// export { TreeContextValues };
export default TreeItemFactory;
