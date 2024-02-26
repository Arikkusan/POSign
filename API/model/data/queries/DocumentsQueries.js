const assert = require('../../Asserter');
const util = require('util');
const getPool = require('../PoolGetter');

/**
 * Retrieves documents from the database.
 * If an ID is provided, retrieves a specific document by ID.
 * @param {number|null} id - The ID of the document to retrieve. If null, retrieves all documents.
 * @returns {Promise<Array<Object>|Object>} - A promise that resolves to an array of documents or a single document object.
 * @throws {Error} - If an error occurs while retrieving the documents.
 */
async function getDocuments(id = null) {
    const toReturn = [];

    id = parseInt(id);

    // Check if the ID is a number or null
    assert(id === null || typeof id === 'number', 'The ID must be a number or null');

    // make the query async
    const pool = getPool();
    const query = util.promisify(pool.query).bind(pool);

    try {
        // Create the query string
        let queryStr = 'SELECT * FROM document';

        // If an ID is provided, add a WHERE clause to the query, the function become a getById
        if (id) {
            queryStr += ' WHERE id = ?';
        }

        // Get all documents | Get the document by ID
        const documents = await query(queryStr, [id]);

        // Get all versions for each document and add them to the return object
        for (const document of documents) {
            const versions = await query('SELECT * FROM version WHERE doc_id = ?', [document.id]);

            // Add the document to the return object
            toReturn.push({
                id: document.id,
                name: document.file_name,
                versions
            });
        }

    } catch (err) {
        console.log(err);
        // throw the error for the controller to catch
        throw new Error('An error occurred while getting the documents');
    } finally {
        // Close the pool
        pool.end();
    }

    // If an ID is provided, return the first element of the array
    if (id) {
        return toReturn[0];
    }

    // Return the array
    return toReturn;
}

/**
 * Creates a document in the database.
 * 
 * @param {Object} data - The data of the document.
 * @throws {Error} If an error occurs while creating the document.
 */
async function createDocument(data, file_path) {
    // make the query async
    const pool = getPool();
    const query = util.promisify(pool.query).bind(pool);

    // Check if the required fields are present
    assert(data.title, 'The file name is required');
    assert(data.date, 'The created date is required');
    assert(file_path, 'The file path is required');

    try {
        // Insert the document into the database
        const documentQuery = 'INSERT INTO document (file_name) VALUES (?)';

        // Get the result of the query
        const result = await query(documentQuery, [data.title]);

        // Insert the version into the database with the document ID from the previous query (result.insertId)
        const versionQuery = 'INSERT INTO version (doc_id, file_path, created_date) VALUES (?, ?, ?)';
        await query(versionQuery, [result.insertId, file_path, data.date]);

    } catch (err) {
        // If an error is thrown, set gotAnError to true and log the error
        console.log(err);
        // throw the error for the controller to catch
        throw new Error('An error occurred while creating the document');
    } finally {
        // Close the pool
        pool.end();

    }
}

/**
 * Updates the name of a document.
 * @param {number} id - The ID of the document.
 * @param {string} name - The new name for the document.
 * @throws {Error} If an error occurs while updating the document name.
 */
async function changeDocumentName(id, name) {
    // make the query async
    const pool = getPool();
    const query = util.promisify(pool.query).bind(pool);

    // Check if the required fields are present
    assert(name, 'The file name is required');

    try {
        // Update the document name
        const documentQuery = 'UPDATE document SET file_name = ? WHERE id = ?';
        await query(documentQuery, [name, id]);

        // Update the version file paths
        await updateVersionPaths(id, name, query);

    } catch (err) {
        console.log(err);
        // throw the error for the controller to catch
        throw new Error('An error occurred while updating the document name');
    } finally {
        // Close the pool
        pool.end();
    }
}


/**
 * Updates the file paths for all versions of a document.
 * 
 * @param {number} id - The ID of the document.
 * @param {string} name - The new name of the document.
 * @param {function} query - The function used to execute the database query.
 * @returns {Promise<void>} - A promise that resolves when the file paths are updated successfully.
 */
async function updateVersionPaths(id, name, query) {
    // Query to retrieve file paths for all versions of the document
    const versionQuery = 'SELECT file_path FROM version WHERE doc_id = ?';
    const currentFilePaths = await query(versionQuery, [id]);
 
    // Check if file paths are found for the given doc_id else it's an error
    if (currentFilePaths.length > 0) {
        // Iterate over each version and update the file path
        for (const currentFilePath of currentFilePaths) {
            const filePath = currentFilePath.file_path;
            const parts = filePath.split('/');

            // Remove the filename & folder from the path
            const filename = parts.pop();
            const folderName = parts.pop();

            // Update the folder name to the new document name
            parts.push(name);

            // Replace the filename with the new document name
            const newFilename = filename.replace(folderName, name);
            parts.push(newFilename);

            // Join all parts back to form the new file path
            const newFilePath = parts.join('/');

            // Perform the update query for each version
            const updateQuery = 'UPDATE version SET file_path = ? WHERE file_path = ?';
            await query(updateQuery, [newFilePath, filePath]);
        }

        console.log('File paths updated successfully for document ID:', id);
    } else {
        console.error('No file paths found for the given doc_id:', id);
    }
}


/**
 * Adds a new version of a document to the database.
 * 
 * @param {number} id - The ID of the document.
 * @param {object} data - The data of the new version.
 * @param {string} file_path - The file path of the new version.
 * @returns {Promise<void>} - A promise that resolves when the version is added successfully.
 * @throws {Error} - If an error occurs while adding the version.
 */
async function addVersion(id, data, file_path) {
    // make the query async
    const pool = getPool();
    const query = util.promisify(pool.query).bind(pool);

    // Check if the required fields are present
    assert(id, 'The document ID is required');
    assert(data.date, 'The created date is required');
    assert(file_path, 'The file path is required');


    try {
        // Insert the version into the database
        const versionQuery = 'INSERT INTO version (doc_id, file_path, created_date) VALUES (?, ?, ?)';
        await query(versionQuery, [id, file_path, data.date]);

    } catch (err) {
        console.log(err);
        // throw the error for the controller to catch
        throw new Error('An error occurred while adding the version');
    } finally {
        // Close the pool
        pool.end();
    }
}

/**
 * Archives a document by setting the archived_date to the current date.
 * @param {number} id - The ID of the document to be archived.
 * @throws {Error} If an error occurs while archiving the document.
 */
async function archiveDocument(id) {

    // make the query async
    const pool = getPool();
    const query = util.promisify(pool.query).bind(pool);

    // Check if the required fields are present
    assert(id, 'The document ID is required');

    try {
        // Archive the document by setting the archived_date to the current date
        const documentQuery = 'UPDATE document SET archived_date = ? WHERE id = ?';
        await query(documentQuery, [new Date(), id]);

    } catch (err) {
        console.log(err);
        // throw the error for the controller to catch
        throw new Error('An error occurred while archiving the document');
    } finally {
        // Close the pool
        pool.end();
    }
}

module.exports = {
    getDocuments,
    createDocument,
    changeDocumentName,
    addVersion,
    archiveDocument
};
