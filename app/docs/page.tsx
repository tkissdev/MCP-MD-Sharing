"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicLocaleProvider, usePublicLocale } from "../public-locale";
import { SiteFooter } from "../site-footer";

export default function DocsPage() {
  return (
    <PublicLocaleProvider>
      <Content />
    </PublicLocaleProvider>
  );
}

function Content() {
  const { t, locale } = usePublicLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>(".doc-section"));
    const q = query.trim().toLowerCase();

    let visible = 0;
    for (const section of sections) {
      const match = q.length === 0 || (section.innerText || "").toLowerCase().includes(q);
      section.classList.toggle("doc-section-hidden", !match);
      if (match) visible++;
    }
    setVisibleCount(visible);
  }, [query]);

  return (
    <div className="landing">
      <main className="docs-page" ref={containerRef}>
        <button className="legal-back" onClick={() => router.back()}>
          ← {locale === "fr" ? "Retour" : "Back"}
        </button>

        <h1>{locale === "fr" ? "Documentation" : "Documentation"}</h1>

        <div className="docs-search-wrap">
          <div className="search-input-wrap">
            <SearchIcon />
            <input
              className="search-input"
              placeholder={locale === "fr" ? "Rechercher dans la documentation…" : "Search the docs…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {visibleCount === 0 && (
          <p className="doc-no-results">
            {locale === "fr" ? "Aucun résultat pour cette recherche." : "No results for this search."}
          </p>
        )}

        {locale === "fr" ? <DocsFR /> : <DocsEN />}
      </main>
      <SiteFooter t={t} />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function DocsFR() {
  return (
    <>
      <section className="doc-section" id="overview">
        <h2>Vue d'ensemble</h2>
        <p>
          MCP-MD-Sharing est une plateforme pour partager et versionner de la documentation
          Markdown en équipe. Elle s'utilise de deux façons, avec exactement les mêmes permissions
          des deux côtés :
        </p>
        <ul>
          <li>
            <strong>La web app</strong> (ce site) — pour créer des organisations, des projets, des
            documents, gérer les membres, et faire des recherches.
          </li>
          <li>
            <strong>Un agent IA connecté au serveur MCP</strong> — Claude Code, Cursor, Codex ou tout
            autre outil compatible avec le Model Context Protocol — pour lire, créer, modifier et
            chercher dans vos documents directement depuis votre éditeur.
          </li>
        </ul>
        <p>
          Une organisation contient des projets, et un projet contient des documents{" "}
          <code>.md</code>. Chaque enregistrement d'un document crée une nouvelle version
          immuable — rien n'est jamais écrasé.
        </p>
      </section>

      <section className="doc-section" id="getting-started">
        <h2>Créer un compte et se connecter</h2>
        <p>
          Depuis la page <a href="/auth">Connexion</a>, vous pouvez créer un compte de deux
          façons :
        </p>
        <ul>
          <li>Avec une adresse email et un mot de passe.</li>
          <li>
            En vous connectant directement avec un <strong>compte Google</strong> (bouton
            "Continuer avec Google").
          </li>
        </ul>
        <p>
          Une fois connecté, vous arrivez sur votre tableau de bord. Si vous ne faites partie
          d'aucune organisation, vous pourrez en créer une immédiatement.
        </p>
      </section>

      <section className="doc-section" id="orgs-projects">
        <h2>Organisations et projets</h2>
        <p>Les permissions fonctionnent à deux niveaux :</p>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Niveau</th>
              <th>Rôles</th>
              <th>Ce qu'ils peuvent faire</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Organisation</td>
              <td>
                <code>propriétaire</code>, <code>admin</code>, <code>membre</code>
              </td>
              <td>
                Un propriétaire ou un admin d'organisation peut gérer l'organisation elle-même
                (renommer, supprimer, gérer les membres) et administre automatiquement tous les
                projets qu'elle contient.
              </td>
            </tr>
            <tr>
              <td>Projet</td>
              <td>
                <code>lecteur</code>, <code>éditeur</code>, <code>admin</code>
              </td>
              <td>
                Un lecteur peut seulement consulter les documents. Un éditeur peut aussi les créer
                et les modifier. Un admin de projet peut en plus renommer/supprimer le projet et
                gérer ses membres.
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          Sur la page <a href="/organization">Organisation</a>, vous pouvez créer une organisation,
          voir la liste de celles dont vous faites partie, ajouter des membres et gérer chacune
          d'elles. Sur la page <a href="/projects">Projets</a>, vous retrouvez la même logique pour
          vos projets : recherche, tri, ajout de fichiers, gestion des membres et suppression.
        </p>
      </section>

      <section className="doc-section" id="documents">
        <h2>Documents et versions</h2>
        <p>
          Un document se crée soit en tapant directement son contenu, soit en glissant-déposant un
          ou plusieurs fichiers <code>.md</code>. Chaque enregistrement crée une nouvelle version —
          rien n'est jamais perdu.
        </p>
        <p>En ouvrant un document, vous pouvez :</p>
        <ul>
          <li>Consulter et modifier le contenu actuel, et enregistrer une nouvelle version.</li>
          <li>Parcourir l'historique complet de toutes les versions précédentes.</li>
          <li>
            Sélectionner deux versions et cliquer sur <strong>Comparer</strong> pour voir les
            différences caractère par caractère (vert = identique, rouge = supprimé, orange =
            modifié).
          </li>
          <li>Restaurer une ancienne version comme nouvelle version actuelle.</li>
        </ul>
        <p>
          Si deux personnes modifient le même document en même temps, la deuxième sauvegarde est
          refusée avec un message de conflit — il suffit de recharger pour récupérer la dernière
          version et réappliquer sa modification.
        </p>
      </section>

      <section className="doc-section" id="search">
        <h2>Recherche</h2>
        <p>
          La page <a href="/search">Recherche</a> et l'outil <code>search</code> du serveur MCP
          utilisent une recherche hybride : à la fois sémantique (elle comprend le sens de votre
          question, pas seulement les mots exacts) et par mot-clé. Les résultats sont toujours
          limités aux projets auxquels vous avez accès — vous ne verrez jamais un document d'un
          projet dont vous n'êtes pas membre.
        </p>
      </section>

      <section className="doc-section" id="mcp-setup">
        <h2>Connecter le serveur MCP à vos outils IA</h2>
        <p>
          C'est ce qui permet à un agent comme Claude Code, Cursor ou Codex de lire et modifier vos
          documents directement depuis votre éditeur, avec les mêmes permissions que sur la web
          app.
        </p>

        <h3>Étape 1 — Créer une clé API</h3>
        <ol>
          <li>
            Allez sur la page <a href="/api-keys">Paramètres et clés API</a>.
          </li>
          <li>
            Donnez un nom à votre clé (par exemple le nom de votre ordinateur) et cliquez sur{" "}
            <strong>Créer la clé</strong>.
          </li>
          <li>
            <strong>Copiez la clé immédiatement</strong> — elle ne sera plus jamais affichée en
            clair ensuite (seule une empreinte est conservée en base, comme un mot de passe).
          </li>
        </ol>

        <h3>Étape 2 — Connecter votre outil</h3>
        <p>
          Tous les outils compatibles MCP ont besoin des deux mêmes informations : l'adresse du
          serveur et votre clé API en en-tête d'autorisation.
        </p>
        <ul>
          <li>
            <strong>Adresse du serveur :</strong> <code>https://mcp-md-sharing.tkissdev.com/api/mcp</code>
          </li>
          <li>
            <strong>En-tête d'autorisation :</strong> <code>Authorization: Bearer &lt;votre-clé-api&gt;</code>
          </li>
        </ul>

        <p>
          <strong>Claude Code</strong> — dans un terminal, exécutez :
        </p>
        <pre>
          {`claude mcp add --transport http mcp-md-sharing https://mcp-md-sharing.tkissdev.com/api/mcp --header "Authorization: Bearer <votre-clé-api>"`}
        </pre>

        <p>
          <strong>Cursor</strong> — ajoutez ceci dans le fichier de configuration MCP de Cursor
          (<code>~/.cursor/mcp.json</code>, ou <code>.cursor/mcp.json</code> à la racine de votre
          projet) :
        </p>
        <pre>
          {`{
  "mcpServers": {
    "mcp-md-sharing": {
      "url": "https://mcp-md-sharing.tkissdev.com/api/mcp",
      "headers": {
        "Authorization": "Bearer <votre-clé-api>"
      }
    }
  }
}`}
        </pre>

        <p>
          <strong>Codex, ou tout autre outil compatible MCP</strong> — la syntaxe exacte de
          configuration varie selon l'outil et évolue régulièrement. Cherchez dans la
          documentation MCP de votre outil comment ajouter un <strong>serveur MCP distant (HTTP)</strong>,
          et renseignez-lui l'adresse du serveur et l'en-tête d'autorisation ci-dessus.
        </p>

        <h3>Étape 3 — Tester que ça fonctionne</h3>
        <p>
          Une fois connecté, demandez simplement à votre agent quelque chose comme{" "}
          <em>« Liste mes projets MCP-MD-Sharing »</em> ou <em>« Cherche "authentification" dans
          mes documents »</em>. S'il vous répond avec vos vrais projets ou documents, la connexion
          fonctionne. Si vous obtenez une erreur d'autorisation, vérifiez que la clé n'a pas été
          révoquée sur la page <a href="/api-keys">Paramètres et clés API</a>.
        </p>
      </section>

      <section className="doc-section" id="tools">
        <h2>Outils disponibles pour les agents IA</h2>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Outil</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>list_projects</code>
              </td>
              <td>Liste les projets auxquels vous avez accès</td>
            </tr>
            <tr>
              <td>
                <code>list_documents</code>
              </td>
              <td>Liste les documents d'un projet</td>
            </tr>
            <tr>
              <td>
                <code>read_document</code>
              </td>
              <td>Lit la version actuelle d'un document</td>
            </tr>
            <tr>
              <td>
                <code>create_document</code>
              </td>
              <td>Crée un nouveau document</td>
            </tr>
            <tr>
              <td>
                <code>update_document</code>
              </td>
              <td>Enregistre une nouvelle version d'un document</td>
            </tr>
            <tr>
              <td>
                <code>get_history</code>
              </td>
              <td>Liste l'historique des versions d'un document</td>
            </tr>
            <tr>
              <td>
                <code>get_version</code>
              </td>
              <td>Lit une version précise d'un document</td>
            </tr>
            <tr>
              <td>
                <code>restore_version</code>
              </td>
              <td>Restaure une ancienne version comme version actuelle</td>
            </tr>
            <tr>
              <td>
                <code>search</code>
              </td>
              <td>Recherche hybride sémantique + mot-clé</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="doc-section" id="faq">
        <h2>Dépannage</h2>
        <ul>
          <li>
            <strong>« Unauthorized » lors de la connexion de l'agent</strong> — la clé API est
            invalide ou a été révoquée. Créez-en une nouvelle depuis{" "}
            <a href="/api-keys">Paramètres et clés API</a>.
          </li>
          <li>
            <strong>L'agent ne trouve aucun projet</strong> — assurez-vous d'être membre d'au moins
            une organisation ou d'un projet avec le même compte que celui utilisé pour créer la
            clé API.
          </li>
          <li>
            <strong>« Version conflict » en enregistrant un document</strong> — quelqu'un d'autre
            (ou votre agent, dans un autre onglet) a déjà enregistré une version plus récente.
            Rechargez la page ou relisez le document pour récupérer la dernière version avant de
            réappliquer votre modification.
          </li>
        </ul>
      </section>
    </>
  );
}

function DocsEN() {
  return (
    <>
      <section className="doc-section" id="overview">
        <h2>Overview</h2>
        <p>
          MCP-MD-Sharing is a platform for sharing and versioning Markdown documentation as a
          team. It works in two ways, with exactly the same permissions on both sides:
        </p>
        <ul>
          <li>
            <strong>The web app</strong> (this site) — create organizations, projects, documents,
            manage members, and search.
          </li>
          <li>
            <strong>An AI agent connected to the MCP server</strong> — Claude Code, Cursor, Codex,
            or any other Model Context Protocol–compatible tool — to read, create, edit, and
            search your documents directly from your editor.
          </li>
        </ul>
        <p>
          An organization contains projects, and a project contains <code>.md</code> documents.
          Every save creates a new immutable version — nothing is ever overwritten.
        </p>
      </section>

      <section className="doc-section" id="getting-started">
        <h2>Creating an account and signing in</h2>
        <p>From the <a href="/auth">Sign in</a> page, you can create an account in two ways:</p>
        <ul>
          <li>With an email address and a password.</li>
          <li>
            By signing in directly with a <strong>Google account</strong> ("Continue with Google"
            button).
          </li>
        </ul>
        <p>
          Once signed in, you land on your dashboard. If you're not part of any organization yet,
          you can create one right away.
        </p>
      </section>

      <section className="doc-section" id="orgs-projects">
        <h2>Organizations and projects</h2>
        <p>Permissions work at two levels:</p>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>Roles</th>
              <th>What they can do</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Organization</td>
              <td>
                <code>owner</code>, <code>admin</code>, <code>member</code>
              </td>
              <td>
                An organization owner or admin can manage the organization itself (rename, delete,
                manage members) and automatically administers every project it contains.
              </td>
            </tr>
            <tr>
              <td>Project</td>
              <td>
                <code>reader</code>, <code>editor</code>, <code>admin</code>
              </td>
              <td>
                A reader can only view documents. An editor can also create and edit them. A
                project admin can additionally rename/delete the project and manage its members.
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          On the <a href="/organization">Organization</a> page, you can create an organization,
          see the ones you belong to, add members, and manage each one. On the{" "}
          <a href="/projects">Projects</a> page, you get the same for your projects: search, sort,
          add files, manage members, and delete.
        </p>
      </section>

      <section className="doc-section" id="documents">
        <h2>Documents and versions</h2>
        <p>
          A document is created either by typing its content directly, or by dragging and dropping
          one or more <code>.md</code> files. Every save creates a new version — nothing is ever
          lost.
        </p>
        <p>When you open a document, you can:</p>
        <ul>
          <li>View and edit the current content, then save a new version.</li>
          <li>Browse the full history of every past version.</li>
          <li>
            Select two versions and click <strong>Compare</strong> to see a character-level diff
            (green = identical, red = removed, orange = modified).
          </li>
          <li>Restore an old version as the new current version.</li>
        </ul>
        <p>
          If two people edit the same document at the same time, the second save is rejected with
          a conflict message — just reload to pick up the latest version, then re-apply your edit.
        </p>
      </section>

      <section className="doc-section" id="search">
        <h2>Search</h2>
        <p>
          The <a href="/search">Search</a> page and the MCP server's <code>search</code> tool both
          use hybrid search: semantic (it understands the meaning of your question, not just exact
          words) and keyword-based. Results are always scoped to the projects you have access to —
          you'll never see a document from a project you're not a member of.
        </p>
      </section>

      <section className="doc-section" id="mcp-setup">
        <h2>Connecting the MCP server to your AI tools</h2>
        <p>
          This is what lets an agent like Claude Code, Cursor, or Codex read and edit your
          documents directly from your editor, with the same permissions as the web app.
        </p>

        <h3>Step 1 — Create an API key</h3>
        <ol>
          <li>
            Go to the <a href="/api-keys">Settings & API Keys</a> page.
          </li>
          <li>
            Give your key a name (e.g. your computer's name) and click <strong>Create key</strong>.
          </li>
          <li>
            <strong>Copy the key right away</strong> — it will never be shown in full again (only
            a fingerprint is kept in the database, like a password).
          </li>
        </ol>

        <h3>Step 2 — Connect your tool</h3>
        <p>
          Every MCP-compatible tool needs the same two things: the server address and your API key
          as an authorization header.
        </p>
        <ul>
          <li>
            <strong>Server address:</strong> <code>https://mcp-md-sharing.tkissdev.com/api/mcp</code>
          </li>
          <li>
            <strong>Authorization header:</strong> <code>Authorization: Bearer &lt;your-api-key&gt;</code>
          </li>
        </ul>

        <p>
          <strong>Claude Code</strong> — in a terminal, run:
        </p>
        <pre>
          {`claude mcp add --transport http mcp-md-sharing https://mcp-md-sharing.tkissdev.com/api/mcp --header "Authorization: Bearer <your-api-key>"`}
        </pre>

        <p>
          <strong>Cursor</strong> — add this to Cursor's MCP config file (<code>~/.cursor/mcp.json</code>,
          or <code>.cursor/mcp.json</code> at your project root):
        </p>
        <pre>
          {`{
  "mcpServers": {
    "mcp-md-sharing": {
      "url": "https://mcp-md-sharing.tkissdev.com/api/mcp",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}`}
        </pre>

        <p>
          <strong>Codex, or any other MCP-compatible tool</strong> — the exact configuration
          syntax varies by tool and changes over time. Check that tool's own MCP documentation for
          how to add a <strong>remote (HTTP) MCP server</strong>, and give it the server address
          and authorization header above.
        </p>

        <h3>Step 3 — Test that it works</h3>
        <p>
          Once connected, just ask your agent something like <em>"List my MCP-MD-Sharing
          projects"</em> or <em>"Search my documents for 'authentication'"</em>. If it replies with
          your actual projects or documents, the connection works. If you get an authorization
          error, check that the key hasn't been revoked on the{" "}
          <a href="/api-keys">Settings & API Keys</a> page.
        </p>
      </section>

      <section className="doc-section" id="tools">
        <h2>Tools available to AI agents</h2>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Tool</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>list_projects</code>
              </td>
              <td>List the projects you can access</td>
            </tr>
            <tr>
              <td>
                <code>list_documents</code>
              </td>
              <td>List the documents in a project</td>
            </tr>
            <tr>
              <td>
                <code>read_document</code>
              </td>
              <td>Read the current version of a document</td>
            </tr>
            <tr>
              <td>
                <code>create_document</code>
              </td>
              <td>Create a new document</td>
            </tr>
            <tr>
              <td>
                <code>update_document</code>
              </td>
              <td>Save a new version of a document</td>
            </tr>
            <tr>
              <td>
                <code>get_history</code>
              </td>
              <td>List a document's version history</td>
            </tr>
            <tr>
              <td>
                <code>get_version</code>
              </td>
              <td>Read a specific version of a document</td>
            </tr>
            <tr>
              <td>
                <code>restore_version</code>
              </td>
              <td>Restore an old version as the current version</td>
            </tr>
            <tr>
              <td>
                <code>search</code>
              </td>
              <td>Hybrid semantic + keyword search</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="doc-section" id="faq">
        <h2>Troubleshooting</h2>
        <ul>
          <li>
            <strong>"Unauthorized" when connecting your agent</strong> — the API key is invalid or
            has been revoked. Create a new one from{" "}
            <a href="/api-keys">Settings & API Keys</a>.
          </li>
          <li>
            <strong>The agent finds no projects</strong> — make sure you're a member of at least
            one organization or project with the same account used to create the API key.
          </li>
          <li>
            <strong>"Version conflict" when saving a document</strong> — someone else (or your
            agent, in another tab) already saved a newer version. Reload the page or re-read the
            document to get the latest version before re-applying your edit.
          </li>
        </ul>
      </section>
    </>
  );
}
