<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <title>{{ config('app.name', 'Laravel') }}</title>
        <link href="https://fonts.bunny.net/css?family=outfit:300,400,500,600,700" rel="stylesheet" />
        <script>
            (function () {
                try {
                    var k = 'theme-preference';
                    var s = localStorage.getItem(k);
                    if (s === 'light') document.documentElement.classList.remove('dark');
                    else if (s === 'dark') document.documentElement.classList.add('dark');
                    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
                } catch (e) { /* ignore */ }
            })();
        </script>
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="bg-slate-100 text-slate-800 [color-scheme:light] antialiased dark:bg-neutral-950 dark:text-neutral-200 dark:[color-scheme:dark]">
        <div id="app"></div>
    </body>
</html>
