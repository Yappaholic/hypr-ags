const hyprland = await Service.import("hyprland");
const audio = await Service.import("audio");
const systemtray = await Service.import("systemtray");
import { NotificationPopups } from "./modules/notifications.js";
import { applauncher } from "./modules/launcher.js";

Utils.monitorFile(
    `${App.configDir}/styles`, 
    function() {
        const css = `${App.configDir}/styles/style.css`;

        // compile, reset, apply
        App.resetCss()
        App.applyCss(css)
    },
)
function Separator() {
    return Widget.Separator({
        class_name: "separator",
        css: "min-height: 30px",
    });
}

const date = Variable('', {
    poll: [1000, "date '+%a %m/%d %H:%M'"],
})

const memory_free = Variable('', {
    poll: [5000, `${App.configDir}/scripts/memory`, out => `󰍛 : ${out}`],
})
const disk_free = Variable('', {
    poll: [30 * 1000, `${App.configDir}/scripts/disk`, out => `󰨣 : ${out}GiB`]
})
const cpu = Variable('', {
    poll: [5 * 1000, `${App.configDir}/scripts/cpu`, out => `󰻠 : ${out}%`]
})

function Logout() {
    return Widget.Button({
        child: Widget.Label("󰐥"),
        css: "min-height: 30px",
        onClicked: () => Utils.execAsync("wlogout"),
    });
}

function Workspaces() {
    const activeId = hyprland.active.workspace.bind("id");
     const workspaces = hyprland.bind("workspaces")
        .as(ws => ws.map(({ id }) => id !== -98 ? Widget.Button({
            on_clicked: () => hyprland.messageAsync(`dispatch workspace ${id}`),
            child: Widget.Label(`${id}`),
            class_name: activeId.as(i => `${i === id ? "focused" : ""}`),
        }): ""))
    return Widget.Box({
        class_name: "workspaces",
        css: "min-height: 30px",
        children: workspaces,
    })
}

function Clock() {
    return Widget.Label({
        class_name: "clock",
        css: "min-height: 30px",
        label: date.bind(),
    })
}

function Memory() {
    return Widget.Label({
        justification: "center",
        class_name: "memory",
        css: "min-height: 30px",
        label: memory_free.bind(),
    })
}

function Disk() {
    return Widget.Label({
        justification: "center",
        class_name: "disk",
        css: "min-height: 30px",
        label: disk_free.bind(),
    })
}

function Cpu() {
    return Widget.Label({
        class_name: "cpu",
        css: "min-height: 30px",
        label: cpu.bind(),
    })
}

function Browser() {
    return Widget.Button({
        child: Widget.Label(""),
        css: "min-height: 30px",
        onClicked: () => Utils.execAsync("zen"),
    })
}
function shorten(string, max_len) {
    if (string.length > max_len) {
        return string.substring(0, max_len) + "...";
    }
    return string;
}

function ClientTitle() {
    return Widget.Label({
        class_name: "client-title",
        css: "min-height: 30px",
        label: hyprland.active.client.bind("title")
        .as(title => shorten(title, 30)),
    })
}

function Volume() {
    return Widget.Button({
        css: "min-height: 30px",
    child: Widget.Icon().hook(audio.speaker, self => {
        const vol = audio.speaker.volume * 100;
        const icon = [
            [101, 'overamplified'],
            [67, 'high'],
            [34, 'medium'],
            [1, 'low'],
            [0, 'muted'],
        ].find(([threshold]) => threshold <= vol)?.[1];

        self.icon = `audio-volume-${icon}-symbolic`;
        self.tooltip_text = `Volume ${Math.floor(vol)}%`;
    }),
})
}

function VolumeButton() {
    return Widget.EventBox({
        class_name: "volume",
        css: "min-height: 30px",
        child: Volume(),
        on_scroll_up: () => VolumeChange("up"),
        on_scroll_down: () => VolumeChange("down"),
        on_primary_click: () => VolumeChange("mute"),
    })
}

const VolumeChange = (call) => {
    switch(call) {
        case "up":
            Utils.exec("wpctl set-volume @DEFAULT_SINK@ 5%+");
            break;
        case "down":
            Utils.exec("wpctl set-volume @DEFAULT_SINK@ 5%-");
            break;
        case "mute":
            Utils.exec("wpctl set-mute @DEFAULT_SINK@ toggle");
            break;
        default:
            break;
    }
}



function SysTray() {
    let items = systemtray.bind("items")
    .as(items => items.map(item => Widget.Button({
            child: Widget.Icon({ icon: item.bind("icon") }),
            on_primary_click: (_, event) => item.activate(event),
            on_secondary_click: (_, event) => item.openMenu(event),
            tooltip_markup: item.bind("tooltip_markup"),
        })))
    return Widget.Box({
        children: items,
        css: "min-height: 30px",
    })
}

function Left() {
    return Widget.Box({
        spacing: 8,
        css: "min-height: 30px",
        class_name: "left",
        hpack: "start",
        children: [
            Logout(),
            Separator(),
            Browser(),
            Separator(),
            ClientTitle(),
        ],
    })
}

function Center() {
    return Widget.Box({
        spacing: 8,
        css: "min-height: 30px",
        class_name: "center",
        hpack: "center",
        children: [
            Workspaces(),
        ],
    })
}

function Right() {
    return Widget.Box({
        spacing: 8,
        css: "min-height: 30px",
        class_name: "end",
        hpack: "end",
        children: [
            Cpu(),
            Separator(),
            Disk(),
            Separator(),
            Memory(),
            Separator(),
            VolumeButton(),
            Separator(),
            Clock(),
        ],
    })
}

const Bar = (monitor) => Widget.Window({
    monitor,
    name: `bar${monitor}`,
    anchor: ['top', 'left', 'right'],
    exclusivity: 'exclusive',
    child: Widget.CenterBox({
        start_widget: Left(),
        center_widget: Center(),
        end_widget: Right(),
    }),
})

App.config({
    style: `./styles/style.css`,
    windows: [
    Bar(0),
    NotificationPopups(),
    applauncher
    ],
})

