// Skapa HTML dialog
{
    const dialog = document.createElement('dialog');
    dialog.id = 'soek-dialog';
    dialog.innerHTML = `
		<header style="
			display: flex;
			justify-content: space-between;
			align-items: center;
		">
			<h3 style="margin: 0;">Sök i satsbib</h3>
			<button id="staeng-knapp">
				Stäng
			</button>
		</header>
		<p>
			<input
				type="search"
				id="soek-input"
				placeholder="Sök på sats, kurs eller nyckelord..." style="width: 100%; box-sizing: border-box;"
				autofocus
			/>
		</p>
		<div
			id="soek-resultat"
			style="max-height: 350px; overflow-y: auto;"
		>
			<!-- Tomt från början -->
		</div>
    `;
    document.body.appendChild(dialog);

    const input = document.getElementById("soek-input");
    const resultatDiv = document.getElementById("soek-resultat");
    const staengKnapp = document.getElementById("staeng-knapp");

    input.addEventListener("input", e =>
	{
        const q = e.target.value.toLowerCase().trim();
        rendreraResultat(q, resultatDiv);
    });

    staengKnapp.addEventListener("click", () => dialog.close());

    // stäng om det tryccks utanför dialogen
    dialog.addEventListener("click", e =>
	{
        const rect = dialog.getBoundingClientRect();
        if(e.clientX < rect.left || e.clientX > rect.right
		|| e.clientY < rect.top || e.clientY > rect.bottom)
		{
            dialog.close();
        }
    });

    const soekKnapp = document.getElementById("soek-knapp");
	(f =>
	{
		soekKnapp?.addEventListener("click", () => f());
		window.addEventListener("keydown", e =>
		{
			if(e.key == '§')
			{
				e.preventDefault();
				f();
			}
		});
	})(() =>
	{
		dialog.showModal();
		input.value = "";
		rendreraResultat("", resultatDiv);
		input.focus();
	});
}

const byggSatsURL = (kurs, filNamn) =>
{
    const ärSatsSida = window.location.href.includes("/satser/");
    const prefix = ärSatsSida ? "../../" : "satser/";
    return `${prefix}${kurs}/${filNamn}/sats.html`;
};

// Filtrera data och rendrera HTML
const rendreraResultat = (q, div) =>
{
    if(!q)
	{
        div.innerHTML = `
			<p>
				<em>
					Skriv något ovan för att söka bland ${ db.length } satser.
				</em>
			</p>
		`;
        return;
    }

    const hits = db.filter(item =>
	{
        const inNamn = item.sats.toLowerCase().includes(q);
        const inKurs = item.kurs.toLowerCase().includes(q);
        const inSats = item.sats.toLowerCase().includes(q);
        const inNyckelord = item.nyckelord.some(k =>
			k.toLowerCase().includes(q)
		);
        return inNamn || inKurs || inSats || inNyckelord;
    });

    if(hits.length === 0)
	{
        div.innerHTML = `
			<p>
				Inga satser matchade "<strong>${ rengoerHtml(q) }</strong>".
			</p>
		`;
        return;
    }

    div.innerHTML = hits.map(item => `
        <div style="border-bottom: 1px solid var(--border); padding: 0.8rem 0;">
			<a href="${ byggSatsURL(item.kurs, item.fil_namn) }">
				<strong style="font-size: 1.1em;">
					${ rengoerHtml(item.sats) }
				</strong> 
			</a>
            <mark style="font-size: 0.8em;">
				${ rengoerHtml(item.kurs) }
			</mark>
            ${
				item.paa_listan
					? "<small style=\"color: green;\"> (På listan)</small>"
					: ""
			}
            <br/>
            <small style="color: var(--text-light);">
                Nyckelord: ${
					item.nyckelord.map(k => 
						`<code>${ rengoerHtml(k) }</code>`
					).join(", ")
				}
            </small>
        </div>
    `).join("");
}

const rengoerHtml = str =>
{
	if(str === undefined) return str;

    return str
        .replaceAll('&', "&amp;")
        .replaceAll('<', "&lt;")
        .replaceAll('>', "&gt;")
        .replaceAll('\"', "&quot;");
}

// lägg till footer
{
	const footer = document.createElement("footer");
	footer.innerHTML = `
		<p>
			satsbib
			・<a href="https://github.com/NoelNimstad/satsbib">GitHub</a>
			・${ new Date().getFullYear() }
		</p>
	`;

	document.body.append(footer);
}

[...document.getElementsByClassName("sats")].forEach(s =>
{
	const db_sats = db.find(e => e.sats == s.innerText);
	if(!db_sats)
	{
		return s.classList.add("finns-inte");
	}

	s.setAttribute(
		"href",
		`../../${ db_sats.kurs }/${ db_sats.fil_namn }/sats.html`
	);
});