import * as yargs from "yargs"
import * as helper from './helper'
import * as path from "path"
import * as fs from "fs"
import * as pd from "pandas-js"
import * as http from "https"
import * as xlsx from "xlsx"
import clear from "clear"

const SHEET_NAME = "eBook list"

let args = yargs
        .option('lang', {
            alias: 'l',
            description: 'Language',
            default: 'en',
            choices: ['en', 'de'],
            type: 'string',
            requiresArg: true,
            defaultDescription: 'books language to download'
        })
        .option('folder', {
            alias: 'f',
            type: 'string',
            description: "folder to store downloads"
        })
        .option('pdf', {
            description: 'Download pdf books'
        })
        .option('epub', {
            description: 'Download epub books'
        })
        .option('dl_chapters', {
            description: 'Download chapters individually'
        })
        .option('category', {
            alias: ['c', 'categories'],
            array: true,
            description: 'book category/categories to download'
        })
        .option('book_index', {
            alias: ['i', 'index', 'indices', 'book_indices'],
            array: true,
            description: 'list of book indices to download'
        })
        .option('verbose', {
            alias: 'v',
            description: 'show more details'
        })
        .argv;

let folder = helper.createPath(args.folder || "./downloads")
let tableUrl = `https://resource-cms.springernature.com/springer-cms/rest/v1/content/${args.lang == "en" ? "17858272" : "17863240"}/data/`
let table = 'table_' + tableUrl.split('/').pop() + '_' + args.lang + '.xlsx'
let tablePath = path.join(folder, table)
var books: any
let patches: any[] = []
let indices: number[] = []
var invalidCategories: string | any[] = []

// clear()
if(!fs.existsSync(tablePath)) {
    console.log("Downloading excel file");
    const file = fs.createWriteStream(tablePath);
    const request = http.get(tableUrl, function(response) {
      response.pipe(file);
      file.on("finish", () => {
          console.log("Finished");
          file.close()
      })
    }).on("error", (error) => {
        file.uncork()
        console.log("An error occurred while downloading excel", error);
    }).on("finish", () => {
        console.log("Download complete");
    }).on("pipe", () => {
        console.log("hello");
    });
} else {
    console.log("Reading excel file");
    var obj = xlsx.readFile(tablePath)
    books = xlsx.utils.sheet_to_json(obj.Sheets[SHEET_NAME])
}

if(!args.pdf && !args.epub)
    args.pdf = args.epub = true
if (args.dl_chapters) {
    args.dl_chapters = args.pdf = true
    args.epub = false
} else {
    args.dl_chapters = false
}
if(args.pdf) {
    patches.push({'url':'/content/pdf/', 'ext':'.pdf','dl_chapters':args.dl_chapters})
}
if(args.epub)
    patches.push({'url':'/download/epub/', 'ext':'.epub','dl_chapters':args.dl_chapters})
if(args.book_index) {
    indices = args.book_index as number[]
    indices.forEach((val, index) => {
        indices[index] = index + 2
    })
}

if(args.category){
    const {selectedIndices, invalidCategories} = helper.indicesOfCategories(args.category as string[], books)
    indices = Array.concat(indices, selectedIndices)
}

if (indices.length == 0 && (invalidCategories.length > 0 || args.book_index)) {
    helper.printInvalidCategories(invalidCategories)
    console.log('No book to download.')
    process.exit()
}

// indices = helper.list(new Set(indices))                            // Remove duplicates
books = helper.filterBooks(books, indices.sort())
//books.index = [i + 2 for i in books.index]              // Recorrect indices
indices.forEach((val, index) => {
    indices[index] = index - 2
})
helper.printSummary(books, invalidCategories, args)
// process.exit()
helper.downloadBooks(books, folder, patches)

console.log('\nFinish downloading.')
