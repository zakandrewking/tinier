var context = require.context('./src', true, /test_.+\.js$/);
context.keys().forEach(context);
