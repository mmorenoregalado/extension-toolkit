import fs from 'fs';
import path from 'path'
import Table from './table'
import ModuleAnalyser from './analyser'
import { createHeader } from '../util/util'

export default async function(type?: string, name?: string) {

    let allowedTypes = ['interfaces', 'components', 'composables', 'displays']
    const analysers: typeof ModuleAnalyser[] = []

    if(type) {
        if(allowedTypes.includes(type) == false) {
            return console.log(`Invalid type! Allowed: ${allowedTypes.join(', ')}`)
        }

        allowedTypes = [type]
    }

    const analyserFiles = fs.readdirSync(path.join(__dirname, 'analyser')).filter(dir => dir.match(/.*?\.js$/))

    for (let i = 0; i < analyserFiles.length; i++) {
        const analyser = analyserFiles[i];
        
        module = await import(path.join(__dirname, 'analyser', analyser))
        Object.values(module).forEach(value => {
            
            if(value instanceof Function && value.__proto__ == ModuleAnalyser) {
                
                let analyser = <typeof ModuleAnalyser> value
                analysers.push(analyser);
            }
        })
    }

    allowedTypes.forEach(folder => {
        scanFolder(folder, analysers, name)
    })
    
}

function scanFolder(folder: string, analysers: typeof ModuleAnalyser[], name?: string) {

    const items = fs.readdirSync(path.join('src', folder));
    let modules = items.filter(dir => !dir.match(/\..*?$/));

    if(name) {
        modules = modules.filter(module => module == name)
    }
    if(modules.length == 0) {
        return console.log("The module could not be found");
    }

    modules.forEach(module => {
        console.log(createHeader(module, 36));
        createDocs(folder, module, analysers)
        scanFolder(path.join(folder, module), analysers)
    })
}

function createDocs(folder: string, moduleName: string, analysers: typeof ModuleAnalyser[]) {
    const folderLocation = path.join('src', folder, moduleName)
    const vueFile = path.join(folderLocation, moduleName + '.vue')
    const readmeFile = path.join(folderLocation, 'readme.md')

    if(!fs.existsSync(vueFile)) {
        return console.log("No Module detected!");
    }

    let file = fs.readFileSync(vueFile).toString('utf8')

    if(!fs.existsSync(readmeFile)) {
        fs.appendFileSync(readmeFile, "")
        console.log("Created Readme for: ", moduleName, " at ", readmeFile);
    }
    
    let readme = fs.readFileSync(readmeFile).toString('utf8')
    readme = readme.replace(/(\r)/g, '')

    let changes: string[] = []

    analysers.forEach(analyserClass => {
        const analyser = new analyserClass(file, moduleName)
        readme = analyser.merge(readme)
        if(analyser.moduleTable.changed)
            changes.push(analyser.moduleTable.name)
    })

    if(fs.existsSync(readmeFile)) {
        fs.unlinkSync(readmeFile)
    }

    if(changes.length > 0)console.log(`${moduleName}: Changes for ${changes.join(', ')}`);

    fs.writeFile(readmeFile, readme, (err) => {if(err)console.error(err)})
}