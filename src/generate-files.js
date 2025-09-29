import fs from "fs";
import path from "path";

const baseDir = "./public";
const folders = ["images", "music"];

function generateFiles() {
    let result = {};

    folders.forEach(folder => {
        const dirPath = path.join(baseDir, folder);

        if (!fs.existsSync(dirPath)) {
            console.warn(`⚠️ Dossier ${folder} introuvable`);
            result[folder] = [];
            return;
        }

        const files = fs.readdirSync(dirPath).filter(file => {
            if (folder === "images") {
                return file.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            }
            if (folder === "music") {
                return file.match(/\.(mp3|wav|ogg)$/i);
            }
            return false;
        });

        result[folder] = files.map(f => `/${folder}/${f}`);
    });

    fs.writeFileSync(path.join(baseDir, "files.json"), JSON.stringify(result, null, 2));
    console.log("✅ files.json mis à jour !");
}

generateFiles();
