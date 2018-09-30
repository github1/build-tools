module.exports = process => {
    return process.argv.slice(0).filter((item, index) => {
        return index > 1;
    });
};