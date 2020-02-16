const select = {
    getContactPhoto(pool, userID, mongoID, successCallback, failureCallback){
        const query = {
            text: 'SELECT filename FROM img.contact_photos WHERE mongoid = $2::CHAR(24) AND uid=$1::UUID ORDER BY added DESC LIMIT 1',
            values: [userID, mongoID]
        };
        performQuery_withValues_noLocal(pool, query, successCallback, failureCallback);
    }
};

const insert = {
    addPhoto(pool, userID, mongoID, fileName, successCallback, failureCallback){
        const query = {
            text: 'INSERT INTO img.contact_photos (mongoid, uid, filename) VALUES($1::CHAR(24),$2::UUID,$3::TEXT)',
            values: [mongoID, userID, fileName]
        };
        performQuery_withValues_noLocal(pool, query, successCallback, failureCallback);
    }
};

// Actual Query Function
function performQuery_withValues_noLocal(pool, query, successCallback, failureCallback){
    pool.connect((err, client, success, failure) => {
        console.log(client);
        const shouldAbort = err => {
            if (err) {
                //Error In Transaction
                console.error('Error in transaction')
                console.log(err);
                var reason;
                client.query('ROLLBACK', err => {
                    if (err) {
                        console.error('Error rolling back client', err.stack)
                        failureCallback({result: "TRANSACTION ROLLBACK FAILED",error: err});
                    }else{
                        //Failed Query Response Object
                        failureCallback(err);
                    }
                    // release the client back to the pool
                    client.release();
                });
            }
            return !!err
        }
        client.query('BEGIN', err => {
            // Check For Errors
            if (shouldAbort(err)) return
            const thework = query.text;
            const insertVals = query.values;
            client.query(thework, insertVals, (err, res) => {
                // Check For Errors
                if (shouldAbort(err)) return

                client.query('COMMIT', err => {
                    if (err) {
                        console.error('Error committing transaction', err.stack)
                        failureCallback(err);
                    }
                    //returning
                    successCallback(res)
                    client.release();
                })
            })
        })
    });
}

// Export ES6 Style
module.exports = {
    select,
    insert
};