# coc-yaml

Fork of [vscode-yaml](https://github.com/redhat-developer/vscode-yaml) that
works with [coc.nvim](https://github.com/neoclide/coc.nvim)

## Supporting

If you like my work, consider supporting me on Patreon or PayPal:

<a href="https://www.patreon.com/chemzqm"><img src="https://c5.patreon.com/external/logo/become_a_patron_button.png" alt="Patreon donate button" /> </a>
<a href="https://www.paypal.com/paypalme/chezqm"><img src="https://werwolv.net/assets/paypal_banner.png" alt="PayPal donate button" /> </a>

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

- `yaml.format.enable` (default: `false`): Enable/disable default YAML formatter (requires restart)
- `yaml.format.singleQuote` (default: `false`): Use single quotes instead of double quotes
- `yaml.format.bracketSpacing` (default: `true`): Print spaces between brackets in objects
- `yaml.format.proseWrap` (default: `"preserve"`): `"always"`: wrap prose if it exeeds the print width, `"never"`: never wrap the prose, `"preserve"`: wrap prose as-is
- `yaml.format.printWidth`: Specify the line length that the printer will wrap on
- `yaml.validate` (default: `true`): Enable/disable validation feature
- `yaml.hover` (default: `true`): Enable/disable hover
- `yaml.completion` (default: `true`): Enable/disable autocompletion
- `yaml.schemas` (default: `{}`): Helps you associate schemas with files in a glob pattern
- `yaml.schemaStore.enable`: When set to true the YAML language server will pull in all available schemas from [JSON Schema Store](http://schemastore.org/json/)
- `yaml.customTags` (default: `[]`): Array of custom tags that the parser will validate against. It has two ways to be used. Either an item in the array is a custom tag such as "!Ref" or you can specify the type of the object !Ref should be by doing "!Ref Scalar". For example: ["!Ref", "!Some-Tag Scalar"]. The type of object can be one of Scalar, Sequence, Mapping, Map.
- `[yaml]`: VSCode-YAML adds default configuration for all yaml files. More specifically it converts tabs to spaces to ensure valid yaml, sets the tab size, and allows live typing autocompletion. These settings can be modified via the corresponding settings inside the `[yaml]` section in the settings:
  - `editor.insertSpaces`
  - `editor.tabSize`
  - `editor.quickSuggestions`

**Note** `insertSpaces` and `tabSize` settings may not work, you need ensure `&shiftwidth` and `&expandtab` options of your yaml buffer.

##### Adding custom tags

In order to use the custom tags in your YAML file you need to first specify the custom tags in the setting of your code editor. For example, you can have the following custom tags:

```YAML
"yaml.customTags": [
    "!Scalar-example scalar",
    "!Seq-example sequence",
    "!Mapping-example mapping"
]
```

The !Scalar-example would map to a scalar custom tag, the !Seq-example would map to a sequence custom tag, the !Mapping-example would map to a mapping custom tag.

You can then use the newly defined custom tags inside the YAML file:

```YAML
some_key: !Scalar-example some_value
some_sequence: !Seq-example
  - some_seq_key_1: some_seq_value_1
  - some_seq_key_2: some_seq_value_2
some_mapping: !Mapping-example
  some_mapping_key_1: some_mapping_value_1
  some_mapping_key_2: some_mapping_value_2
```

##### Associating a schema to a glob pattern via yaml.schemas:

yaml.schemas applies a schema to a file. In other words, the schema (placed on the left) is applied to the glob pattern on the right. Your schema can be local or online. Your schema must be a relative path and not an absolute path.

When associating a schema it should follow the format below

```JSON
"yaml.schemas": {
    "url": "globPattern",
    "Kubernetes": "globPattern"
}
```

e.g.

```JSON
"yaml.schemas": {
    "http://json.schemastore.org/composer": ["/*"],
    "file:///home/johnd/some-schema.json": ["some.yaml"],
    "../relative/path/schema.json": ["/config*.yaml"],
    "/Users/johnd/some-schema.json": ["some.yaml"],
}
```

e.g.

```JSON
"yaml.schemas": {
    "kubernetes": ["/myYamlFile.yaml"]
}
```

e.g.

```JSON
"yaml.schemas": {
    "http://json.schemastore.org/composer": ["/*"],
    "kubernetes": ["/myYamlFile.yaml"]
}
```

Since `0.11.0` YAML Schemas can be used for validation:

```json
"/home/user/custom_schema.yaml": "someFilePattern.yaml"
```

- The entrance point for `yaml.schemas` is location in [user and workspace settings](https://code.visualstudio.com/docs/getstarted/settings#_creating-user-and-workspace-settings)
- Supports schemas through [schema store](http://schemastore.org/json/) as well as any other schema url
- Supports 'yamlValidation' point which allows you to contribute a schema for a specific type of yaml file (Similar to [jsonValidation](https://code.visualstudio.com/docs/extensionAPI/extension-points#_contributesjsonvalidation))
  e.g.

```JSON
{
  "contributes": {
    "yamlValidation": [
      {
        "fileMatch": "yourfile.yml",
        "url": "./schema.json"
      }
    ]
  }
}
```

This extension allows you to specify json schemas that you want to validate against the yaml that you write. In the vscode user and workspace preferences you can set a url and a glob pattern that you want to validate against the schema. Kubernetes is an optional field. They do not require a url as the language server will provide that. You just need the keyword kubernetes and a glob pattern.

## Debug

Add `"yaml.trace.server": "verbose"` to your `coc-settings.json` to get verbose
output of LSP communication.

Open output channel by command:

```
:CocCommand workspace.showOutput yaml
```

## License

MIT
