"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var util_1 = require("../util/util");
var table_1 = __importDefault(require("../util/table"));
exports.docs = function (folders) {
    var allowedFolders = ['all', 'interfaces', 'components'];
    if (allowedFolders.includes(folders) == false) {
        return console.log("Invalid folder!");
    }
    allowedFolders.shift();
    var folderList = folders == 'all' ? allowedFolders : [folders];
    folderList.forEach(function (folder) {
        var elements = fs_1.default.readdirSync('./src/' + folder).filter(function (dir) { return !dir.match(/\..*?$/); });
        elements.forEach(function (element) { return createDocs(folder, element); });
    });
};
function createDocs(folder, elementName) {
    var folderLocation = path_1.default.join('src', folder, elementName);
    var vueFile = path_1.default.join(folderLocation, elementName + '.vue');
    var readmeFile = path_1.default.join(folderLocation, 'readme.md');
    if (!fs_1.default.existsSync(vueFile)) {
        return console.log("No Element detected: ", elementName);
    }
    console.log(elementName);
    var file = fs_1.default.readFileSync(vueFile).toString('utf8');
    var script = getSection(file.replace(/(\r|\n|\t)/g, ''), 'script'); // remove any whitespace character exept space
    if (!script)
        return;
    var props = getProps(script);
    var css = getSection(file, 'style');
    if (!css)
        return;
    var cssVars = getCssVars(css, elementName);
    if (!fs_1.default.existsSync(readmeFile)) {
        fs_1.default.mkdirSync(readmeFile);
        console.log("Created Readme for: ", elementName, " at ", readmeFile);
    }
    var readme = fs_1.default.readFileSync(readmeFile).toString('utf8');
    readme = readme.replace(/(\r|\t)/g, '');
    var propsTable = table_1.default.getTable(readme, 'Props');
    if (propsTable) {
        propsTable.generateTableString();
        propsTable.updateColumn('Prop');
        propsTable.updateColumn('Description');
        propsTable.updateColumn('Type');
        Object.entries(props).forEach(function (entry) {
            var required = entry[1].required || 'false';
            var prop = util_1.wrapText(util_1.camelToSnake(entry[0]), '`');
            if (required == 'true')
                prop += '*';
            var def = entry[1].default || '';
            var type = entry[1].type || '';
            propsTable.updateRowByObject({
                Prop: prop,
                Default: util_1.wrapText(def, '`'),
                Type: util_1.wrapText(type, '`')
            }, 'Prop');
        });
        propsTable.hideNoneExistingRows(Object.keys(props).map(function (prop) { return util_1.wrapText(util_1.camelToSnake(prop), '`'); }));
        propsTable.generateTableString();
    }
    var cssVarTable = table_1.default.getTable(readme, 'CSS Variables');
    if (cssVarTable) {
        console.log(cssVarTable.generateTableString());
        cssVarTable.updateColumn('Variable');
        cssVarTable.updateColumn('Default');
        Object.entries(cssVars).forEach(function (entry) {
            var variable = entry[0], def = entry[1];
            cssVarTable.updateRowByObject({
                Variable: util_1.wrapText(variable, '`'),
                Default: util_1.wrapText(def, '`')
            }, 'Variable');
        });
        cssVarTable.hideNoneExistingRows(Object.keys(cssVars).map(function (cssVar) { return util_1.wrapText(cssVar, '`'); }));
        console.log(cssVarTable.generateTableString());
    }
}
function getCssVars(section, elementName) {
    var cssVarsObject = {};
    var cssVars = section.match(new RegExp("^\t?(--" + elementName + ".*?: .*?;)+?", 'gm'));
    if (!cssVars)
        return cssVarsObject;
    cssVars.forEach(function (variable) {
        var _a = variable.replace(/(\t|;)/g, '').split(': '), key = _a[0], value = _a[1];
        cssVarsObject[key] = value;
    });
    return cssVarsObject;
}
function getProps(section) {
    var props = {}, key = "", prop = "", depth = 0;
    var i = section.indexOf('props:') + 5;
    while (section.charAt(i) != '{') {
        i++;
    }
    for (i; i < section.length; i++) {
        var c = section.charAt(i);
        if (depth == 1)
            key += c;
        if (depth > 1 && c != '}')
            prop += c;
        if (c == '{')
            depth++;
        if (c == '}') {
            depth--;
            if (depth == 1) {
                props[key.replace(/(\s|:|{|}|'|,)/gm, '')] = propOptionsToObject(prop);
                key = "";
                prop = "";
            }
        }
        if (depth == 0)
            break;
    }
    return props;
}
function propOptionsToObject(prop) {
    var options = {};
    prop.split(',').forEach(function (option) {
        var o = option.split(': ');
        options[o[0]] = o[1];
    });
    return options;
}
function getSection(text, name) {
    var match = text.match(new RegExp("<" + name + ".*?>(.|\\s)*?</" + name + ".*?>", 'gm'));
    if (match)
        return match[0];
    return null;
}
