const { Client } = require('@notionhq/client')
const dotenv = require('dotenv')
const sendMail = require('./sendMail')
dotenv.config()

const notion = new Client({ auth: process.env.NOTION_KEY })

const database_id = process.env.NOTION_DATABASE_ID

//A JSON Object to hold all tasks in the Notion database
let tasksInDatabase = {}

async function findChangesAndSendEmails() {
    console.log('Looking for changes in Notion database ')
    //Get the tasks currently in the database
    const currTasksInDatabase = await getTasksFromDatabase()

    //Iterate over the current tasks and compare them to tasks in our local store (tasksInDatabase)
    for (const [key, value] of Object.entries(currTasksInDatabase)) {
        const page_id = key
        const curr_status = value.Status
        //If this task hasn't been seen before
        if (!page_id in tasksInDatabase) {
            //Add this task to the local store of all tasks
            tasksInDatabase[page_id] = {
                Status: curr_status,
            }
        } else {
            //If the current status is different from the status in the local store
            if (curr_status !== tasksInDatabase[page_id].Status) {
                //Change the local store.
                tasksInDatabase[page_id] = {
                    Status: curr_status,
                }

                const subject = 'Notion Task Status Updated'
                const text =
                    "A Notion task's: " +
                    value.Title +
                    ' status has been updated to ' +
                    curr_status +
                    '.'
                sendMail(subject, text).catch(console.error)
                console.log('Status Changed')
            }
        }
    }
    //Run this method every 5 seconds (5000 milliseconds)
    setTimeout(main, 5000)
}

function main() {
    findChangesAndSendEmails().catch(console.error)
}

;(async () => {
    tasksInDatabase = await getTasksFromDatabase()
    main()
})()

//Get a paginated list of Tasks currently in a the database.
async function getTasksFromDatabase() {
    const tasks = {}

    async function getPageOfTasks(cursor) {
        let request_payload = ''
        //Create the request payload based on the presense of a start_cursor
        if (cursor == undefined) {
            request_payload = {
                path: 'databases/' + database_id + '/query',
                method: 'POST',
            }
        } else {
            request_payload = {
                path: 'databases/' + database_id + '/query',
                method: 'POST',
                body: {
                    start_cursor: cursor,
                },
            }
        }
        //While there are more pages left in the query, get pages from the database.
        const current_pages = await notion.request(request_payload)

        for (const page of current_pages.results) {
            if (page.properties.Status) {
                tasks[page.id] = {
                    Status: page.properties.Status.select.name,
                    Title: page.properties.Name.title[0].text.content,
                }
            } else {
                tasks[page.id] = {
                    Status: 'No Status',
                    Title: page.properties.Name.title[0].text.content,
                }
            }
        }
        if (current_pages.has_more) {
            await getPageOfTasks(current_pages.next_cursor)
        }
    }
    await getPageOfTasks()
    return tasks
}
