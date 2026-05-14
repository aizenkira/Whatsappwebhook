const { generalCommands } = require("./general");
const { ownerCommands } = require("./owner");
const { groupCommands } = require("./group");
const { aiCommands } = require("./ai");
const { infoCommands } = require("./info");
const { funCommands } = require("./fun");
const { mediaCommands } = require("./media");
const { contentCommands } = require("./content");

// Merge all commands into one map
const commands = {
  ...generalCommands,
  ...ownerCommands,
  ...groupCommands,
  ...aiCommands,
  ...infoCommands,
  ...funCommands,
  ...mediaCommands,
  ...contentCommands,
};

// Build alias → canonical name map
const aliasMap = {};
for (const [name, cmd] of Object.entries(commands)) {
  if (cmd.aliases) {
    for (const alias of cmd.aliases) {
      aliasMap[alias] = name;
    }
  }
}

/** Look up a command by name or alias. Returns null if not found. */
function resolveCommand(input) {
  const canonical = aliasMap[input] ?? input;
  return commands[canonical] ?? null;
}

module.exports = { commands, aliasMap, resolveCommand };
