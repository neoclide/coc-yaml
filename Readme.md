# coc-yaml

Fork of [vscode-yaml](https://github.com/redhat-developer/vscode-yaml) that
works with [coc.nvim](https://github.com/neoclide/coc.nvim)

## Install

In your vim/neovim, run command:

```
:CocInstall coc-yaml
```

## Features

![screencast](https://raw.githubusercontent.com/redhat-developer/vscode-yaml/master/images/demo.gif)

1. YAML validation:
   - Detects whether the entire file is valid yaml
   - Detects errors such as:
     - Node is not found
     - Node has an invalid key node type
     - Node has an invalid type
     - Node is not a valid child node
2. Document Outlining (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd>):
   - Provides the document outlining of all completed nodes in the file
3. Auto completion (<kbd>Ctrl</kbd> + <kbd>Space</kbd>):
   - Auto completes on all commands
   - Scalar nodes autocomplete to schema's defaults if they exist
4. Hover support:
   - Hovering over a node shows description _if provided by schema_
5. Formatter:
   - Allows for formatting the current file

_Auto completion and hover support are provided by the schema. Please refer to Language Server Settings to setup a schema_

# Language Server Settings

The following settings are supported:

- `yaml.format.enable`: Enable/disable default YAML formatter (requires restart)
- `yaml.format.singleQuote`: Use single quotes instead of double quotes
- `yaml.format.bracketSpacing`: Print spaces between brackets in objects
- `yaml.format.proseWrap`: Always: wrap prose if it exeeds the print width, Never: never wrap the prose, Preserve: wrap prose as-is
- `yaml.validate`: Enable/disable validation feature
- `yaml.hover`: Enable/disable hover
- `yaml.completion`: Enable/disable autocompletion
- `yaml.schemas`: Helps you associate schemas with files in a glob pattern
- `yaml.customTags`: Array of custom tags that the parser will validate against. It has two ways to be used. Either an item in the array is a custom tag such as "!Ref" or you can specify the type of the object !Ref should be by doing "!Ref Scalar". For example: ["!Ref", "!Some-Tag Scalar"]. The type of object can be one of Scalar, Sequence, Mapping, Map.
- `[yaml]`: VSCode-YAML adds default configuration for all yaml files. More specifically it converts tabs to spaces to ensure valid yaml, sets the tab size, and allows live typing autocompletion. These settings can be modified via the corresponding settings inside the `[yaml]` section in the settings:
  - `editor.insertSpaces`
  - `editor.tabSize`
  - `editor.quickSuggestions`

##### Associating a schema to a glob pattern via yaml.schemas:

yaml.schemas applies a schema to a file. In other words, the schema (placed on the left) is applied to the glob pattern on the right. Your schema can be local or online. Your schema must be a relative path and not an absolute path.

When associating a schema it should follow the format below

```
yaml.schemas: {
    "url": "globPattern",
    "Kubernetes": "globPattern",
    "kedge": "globPattern"
}
```

e.g.

```
yaml.schemas: {
    "http://json.schemastore.org/composer": "/*"
}
```

e.g.

```
yaml.schemas: {
    "kubernetes": "/*.yaml"
}
```

e.g.

```
yaml.schemas: {
    "kedge": "/myKedgeApp.yaml"
}
```

e.g.

```
yaml.schemas: {
    "http://json.schemastore.org/composer": "/*",
    "kubernetes": "/myYamlFile.yaml"
}
```

- To add `yaml.schemas`, open settings file by command: `:CocConfig`.
- Supports schemas through [schema store](http://schemastore.org/json/) as well as any other schema url
- Supports 'yamlValidation' point which allows you to contribute a schema for a specific type of yaml file (Similar to [jsonValidation](https://code.visualstudio.com/docs/extensionAPI/extension-points#_contributesjsonvalidation))

This extension allows you to specify json schemas that you want to validate against the yaml that you write.

## Debug

Add `"yaml.server.trace": "verbose"` to your `coc-settings.json` to get verbose
output of LSP communication.

Open output channel by command:

```
:CocCommand workspace.showOutput yaml
```

## License

MIT
