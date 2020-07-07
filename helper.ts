import * as fs from "fs"
import * as path from "path"
import * as https from "https"
import * as http from "http"
import {Series, Dataframe} from "pandas-js"
import assert from "assert"
import axios from "axios"
import progress from "progress"
import { stream } from "xlsx/types"
import request from "request"
import _cliProgress from "cli-progress"

let BOOK_TITLE = 'Book Title'
let CATEGORY   = 'English Package Name'
let MIN_FILENAME_LEN = 50                   // DON'T CHANGE THIS VALUE!!!
let MAX_FILENAME_LENGTH = 145                  // Must be >50
let CHUNK_SIZE = 1024


export const convertToASCII = function(string: string): string {
  return string
  // return string.split("").map((c, i) => {
  //   c = String.fromCharCode(c.charCodeAt(i))
  // }).join()

  // pd.series()
  // pd.series()
  
}

// Create path if it doesn't exist
export const createPath = function(path: string): string {
  if(!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
  return path;
}

// Return the book path if it doesn't exist. Otherwise return null.
export const getBookPathIfNew = function(basePath: string, bookName: string, patch: any): string | null {
  var outputFile = path.join(basePath, bookName + patch["ext"])
  if(fs.existsSync(outputFile)) {
    return null
  }
  return outputFile
}

export const printInvalidCategories = function(invalidCategories: any[]) {
  if (invalidCategories.length > 0) {
    invalidCategories = new Series(invalidCategories)
    // var series = pd.series(invalidCategories)
    // invalidCategories = series(~series.duplicateed())
    var correctNoun = `categor${invalidCategories.length > 1 ? "ies" : "y"}`
    console.log(`The following invalid book ${correctNoun} will be ignored:\n`)
    invalidCategories.forEach((invalidCategory, index) => {
      console.log(`${index + 1}, ${invalidCategory}\n`)
    })
  }
}

export const printSummary = function(books: any[], invalidCategories: string[], args: any) {
  // // Set Pandas to no maximum row limit
  // pd.set_option('display.max_rows', None)

  if(args.verbose) {
    let table: any[] = []
    books.forEach((book) => {
      table.push({
        "Book Title" : book[BOOK_TITLE],
        category: book[CATEGORY]
      })
      // console.table(`${book[BOOK_TITLE]}, ${book[CATEGORY]}`);      
    })
    console.table(table)
  }
  console.log(`${books.length} titles ready to be downloaded...`);
  printInvalidCategories(invalidCategories)

}

export const filterBooks = function(books: any[], indices: number[]) {
  if(indices.length == 0) {
    for (let i = 0; i < books.length; i++) {
      indices.push(i)      
    }
  }
  let filteredBooks: any[] = []
  indices.forEach((i) => {
    filteredBooks.push(books[i])
  })
  return filteredBooks
}

export const indicesOfCategories = function(categories: string[], books: any[]) {
  let selectedIndices: number[] = []
  let invalidCategories: string[] = []
  categories.forEach((category) => {
    var index: number = 3000
    books.some((book, i) => {
      if(book[CATEGORY].search(new RegExp(`^${category}$`, "i"))) {
        index = i
        return true
      }
      return false
    })

    if(index == 3999) {
      invalidCategories.push(category)
    } else {
      selectedIndices.push(index)
    }
  })
  return {selectedIndices: selectedIndices, invalidCategories: invalidCategories}
}

export const downloadBook = async function(url: string, outputFile: string, titleAndType: string) {

  console.log(url);
  

//   const progressBar = new _cliProgress.SingleBar({
//     format: '{bar} {percentage}% | ETA: {eta}s'
// }, _cliProgress.Presets.shades_classic);

// const file = fs.createWriteStream(outputFile);
// let receivedBytes = 0


// request.get(url)
// .on('response', (response) => {
//     if (response.statusCode !== 200) {
//         return console.log('Response status was ' + response.statusCode);
//     }

//     const totalBytes = response.headers['content-length'];
//     progressBar.start(Number(totalBytes), 0);
// })
// .on('data', (chunk) => {
//     receivedBytes += chunk.length;
//     progressBar.update(receivedBytes);
// })
// .pipe(file)
// .on('error', (err) => {
//     fs.unlink(outputFile, () => {

//     });
//     progressBar.stop();
//     return console.log(err.message);
// });

// file.on('finish', () => {
//     progressBar.stop();
//     file.close();
// });

// file.on('error', (err) => {
//     fs.unlink(outputFile, () => {}); 
//     progressBar.stop();
//     return console.log(err.message);
// });

  axios({
    url,
    method: 'GET',
    responseType: 'stream'
  })
  .then((response) => {
    let headers = response.headers
    let data = response.data
    const totalLength = headers['content-length']

    const progressBar = new progress('-> downloading [:bar] :percent :etas', {
      width: 40,
      complete: '=',
      incomplete: ' ',
      renderThrottle: 1,
      total: parseInt(totalLength)
    })
  
    let tempDir = createPath("./tmp")
  
    let tempFile = path.resolve(__dirname, tempDir, outputFile.split("/").pop()!)
    const writer = fs.createWriteStream(tempFile)
  
    data.on('data', (chunk: string | any[]) => {
      // const length = chunk.length
      // console.log(chunk.length);
      // process.exit()
      
      progressBar.tick(chunk)
    })
    data.pipe(writer)
  
    writer.on("finish", () => {
      fs.rename(tempFile, outputFile, (error) => {
        if(error) {
          console.log("An error occurred while moving your file from the temporary directory", error);
          process.exit()
        }
        writer.close()
      })
    }).on("error", (error) => {
      console.log("An error occurred while while downloading the file", error);
      process.exit()
    })
  })
  .catch((error) => {
    console.log(error.message);
    // process.exit()    
  })




  // const { data, headers } = await axios({
  //   url,
  //   method: 'GET',
  //   responseType: 'stream'
  // })

  // const totalLength = headers['content-length']

  // const progressBar = new progress('-> downloading [:bar] :percent :etas', {
  //   width: 40,
  //   complete: '=',
  //   incomplete: ' ',
  //   renderThrottle: 1,
  //   total: parseInt(totalLength)
  // })

  // let tempDir = createPath("./tmp")

  // let tempFile = path.resolve(__dirname, tempDir, outputFile.split("/").pop()!)
  // const writer = fs.createWriteStream(tempFile)

  // data.on('data', (chunk: string | any[]) => progressBar.tick(chunk.length))
  // data.pipe(writer)

  // writer.on("finish", () => {
  //   fs.rename(tempFile, outputFile, (error) => {
  //     if(error) {
  //       console.log("An error occurred while moving your file from the temporary directory", error);
  //       process.exit()
  //     }
  //     writer.close()
  //   })
  // }).on("error", (error) => {
  //   console.log("An error occurred while while downloading the file", error);
  //   process.exit()
  // })
}

export const downloadBooks = async function(books: any[], folder: string, patches: any[]) {
  
  let maxLength = getMaxFilenameLength(folder)
  let longestName = books.reduce((a, b) => {
    return a[CATEGORY].length > b[CATEGORY].length ? a : b
  })
  if ((maxLength - longestName) < MIN_FILENAME_LEN) {
    console.log('The download directory path is too lengthy:')
    console.log(path.resolve(folder));
    console.log('Please choose a shorter one')
    process.exit()
  }

  console.log("About to download");
  books.forEach((book, index) => {
    // console.log(book);
    
    let destinationFolder = createPath(path.join(folder, book[CATEGORY]))
    let filenameLength = maxLength - book[CATEGORY].length - 2
    if(filenameLength > MAX_FILENAME_LENGTH) {
      filenameLength = MAX_FILENAME_LENGTH
    }
    let url: string = book["OpenURL"]
    let title = convertToASCII(book["Book Title"])
    let author = book["Author"]
    let edition = book["Edition"]
    let isbn = book["Electronic ISBN"]
    let category = convertToASCII(book["English Package Name"])
    let bookName = composeBookName(title, author, edition, isbn, filenameLength)

    patches.forEach(async (patch) => {
      let titleAndType = `${title} [${category}] (${patch["ext"].slice(1)})`
      try {
        if (!patch['dl_chapters']) {
          let outputFile = getBookPathIfNew(destinationFolder, bookName, patch)
          if (outputFile) {
            let response = await axios({
              url,
              method: "GET"
            })

            url = response.request.res.responseUrl
            
            let newUrl = url.replace('%2F', '/').replace('/book/', patch['url']) + patch['ext']
            await downloadBook(newUrl, outputFile, titleAndType)
          }
        } else {
          console.log("Chapter download under development");
          process.exit();
        }
      } catch (error) {
        console.error(`* Problem downloading: ${title} (${patch["ext"]}), so skipping it.`, error.message)
      }
    })
  })
}

export const getMaxFilenameLength = (filePath: string): number => {
  // Use binary search to determine the maximum filename length
  // possible for the given path
  var hi = 1024
  var mid = 1024
  var lo = 0
  while(mid > lo){
    var name = createRandomHexString(mid)
    try {
      var testFile = path.join(filePath, name + ".temp")
      fs.writeFileSync(testFile, "Hello World")
      lo = mid
      fs.unlink(testFile, (error) => {
        if(error) {
          console.log("Couldn't remove test file", testFile, error);
        }
      })
    } catch (error) {
      if(error.code == "EACCES") {
        continue
      }
      hi = mid
    }
    mid = Math.trunc((hi + lo) / 2)
  }
  return mid
}
  
export const createRandomHexString = (length: number): string => {
  return [...Array(length)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
}

let replacements: {[key: string]: string} = {'/':'-', '\\':'-', ':':'-', '*':'', '>':'', '<':'', '?':'',
                '|':'', '"':''}

export const composeBookName = (title: string, author: string, edition: string, isbn: string, maxLength: number) => {
  
    var bookName: string = title + ' - ' + author + ', ' + edition + ' - ' + isbn
    if(bookName.length > maxLength){
        bookName = title + ' - ' + author.split(',')[0] + ' et al., ' + edition + ' - ' + isbn
    }
    if(bookName.length > maxLength){
        bookName = title + ' - ' + author.split(',')[0] + ' et al. - ' + isbn
    }
    if(bookName.length > maxLength){
        bookName = title + ' - ' + isbn
    }
    if(bookName.length > maxLength){
        if(maxLength < 20){
          console.log( "maxLength must not be less than 20")
          process.exit()          
        }
        bookName = title.substring(0, maxLength - 20) + ' - ' + isbn
    }
    bookName = convertToASCII(bookName)
    var chars: string[] = bookName.split("")
    chars.map((c) => {
      if(c in replacements) {
        c = replacements[c]
      }
    })
    
    return chars.join("")
}

export const list = function (iterable: any) {
  if(!iterable) {
    return []
  }
  return [...iterable];  
}