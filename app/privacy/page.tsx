"use client";

import { useRouter } from "next/navigation";
import { PublicLocaleProvider, usePublicLocale } from "../public-locale";
import { SiteFooter } from "../site-footer";

export default function PrivacyPage() {
  return (
    <PublicLocaleProvider>
      <Content />
    </PublicLocaleProvider>
  );
}

function Content() {
  const { t, locale } = usePublicLocale();
  const router = useRouter();

  return (
    <div className="landing">
      <main className="legal-page">
        <button className="legal-back" onClick={() => router.back()}>
          ← {locale === "fr" ? "Retour" : "Back"}
        </button>

        {locale === "fr" ? <PrivacyFR /> : <PrivacyEN />}
      </main>
      <SiteFooter t={t} />
    </div>
  );
}

function PrivacyFR() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p className="legal-updated">Dernière mise à jour : 27 juillet 2026</p>

      <section className="legal-section">
        <h2>1. Qui sommes-nous ?</h2>
        <p>
          MCP-MD-Sharing est une plateforme de partage et de versioning de documentation Markdown,
          accessible en ligne et depuis des agents IA (Claude Code, Cursor, Codex) via le Model
          Context Protocol, à l'adresse{" "}
          <a href="https://mcp-md-sharing.tkissdev.com">mcp-md-sharing.tkissdev.com</a>. Le service
          est opéré par <strong>TKissDev</strong> (contact : contact@tkissdev.com).
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Données collectées</h2>
        <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
        <ul>
          <li>
            <strong>Adresse e-mail</strong> — utilisée pour l'authentification.
          </li>
          <li>
            <strong>Données Google</strong> — si vous vous connectez via Google : identifiant,
            adresse e-mail et avatar fournis par ce service.
          </li>
          <li>
            <strong>Contenu que vous ajoutez</strong> — organisations, projets, documents Markdown
            et leur historique de versions.
          </li>
          <li>
            <strong>Clés API personnelles</strong> — stockées sous forme de hash (jamais en clair),
            utilisées pour connecter vos agents IA.
          </li>
        </ul>
        <p>Nous ne collectons pas : localisation, données bancaires, publicité, suivi comportemental.</p>
      </section>

      <section className="legal-section">
        <h2>3. Finalité du traitement</h2>
        <ul>
          <li>Authentification et accès sécurisé à votre compte</li>
          <li>Stockage et affichage de vos organisations, projets et documents</li>
          <li>Recherche sémantique dans vos documents (voir section 5 pour l'envoi à OpenAI)</li>
          <li>Connexion sécurisée de vos agents IA via une clé API personnelle</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>4. Base légale (RGPD)</h2>
        <p>
          Le traitement repose sur votre <strong>consentement</strong> (art. 6.1.a RGPD), exprimé
          lors de la création de votre compte, et sur l'<strong>exécution du contrat</strong> de
          service (art. 6.1.b RGPD).
        </p>
      </section>

      <section className="legal-section">
        <h2>5. Stockage et hébergement</h2>
        <p>
          Les données sont stockées dans <strong>Supabase</strong> (base de données PostgreSQL).
          L'application web est hébergée sur <strong>Vercel</strong>. Pour la recherche
          sémantique, le contenu de vos documents est envoyé à <strong>OpenAI</strong> afin de
          générer des vecteurs de recherche — ce contenu n'est utilisé que pour cette requête,
          conformément à la politique API d'OpenAI. Ces prestataires sont soumis à des garanties de
          protection des données (DPA, clauses contractuelles types).
        </p>
      </section>

      <section className="legal-section">
        <h2>6. Durée de conservation</h2>
        <p>
          Vos données sont conservées tant que votre compte est actif. Pour demander la suppression
          de votre compte, contactez-nous — vos données seront effacées sous 30 jours.
        </p>
      </section>

      <section className="legal-section">
        <h2>7. Partage des données</h2>
        <p>
          Nous ne vendons ni ne partageons vos données avec des tiers à des fins commerciales. Seuls
          les prestataires techniques indispensables (Supabase, Vercel, OpenAI) traitent vos
          données, dans le strict cadre de la fourniture du service.
        </p>
      </section>

      <section className="legal-section">
        <h2>8. Vos droits (RGPD)</h2>
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul>
          <li>
            <strong>Accès</strong> — obtenir une copie de vos données
          </li>
          <li>
            <strong>Rectification</strong> — corriger des données inexactes
          </li>
          <li>
            <strong>Suppression</strong> — effacer votre compte et toutes vos données
          </li>
          <li>
            <strong>Portabilité</strong> — exporter vos données dans un format lisible
          </li>
          <li>
            <strong>Opposition</strong> — vous opposer à un traitement
          </li>
        </ul>
        <p>
          Pour exercer ces droits, contactez-nous à : <a href="mailto:contact@tkissdev.com">contact@tkissdev.com</a>.
          Délai de réponse : 30 jours maximum.
        </p>
        <p>
          Vous pouvez également adresser une réclamation à la <strong>CNIL</strong> :{" "}
          <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noreferrer">
            cnil.fr/fr/plaintes
          </a>
          .
        </p>
      </section>

      <section className="legal-section">
        <h2>9. Cookies et traceurs</h2>
        <p>
          MCP-MD-Sharing utilise un cookie de session nécessaire à votre connexion. Des données
          sont aussi stockées localement dans votre navigateur (<code>localStorage</code>)
          uniquement pour mémoriser vos préférences d'interface (langue, état de la colonne
          latérale). Aucun cookie publicitaire ni traceur de suivi.
        </p>
      </section>

      <section className="legal-section">
        <h2>10. Modifications</h2>
        <p>
          Cette politique peut être mise à jour. En cas de changement significatif, vous en serez
          informé par e-mail ou via une notification sur le site.
        </p>
      </section>

      <section className="legal-section">
        <h2>11. Contact</h2>
        <p>
          Pour toute question relative à cette politique : <a href="mailto:contact@tkissdev.com">contact@tkissdev.com</a>
        </p>
      </section>
    </>
  );
}

function PrivacyEN() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: July 27, 2026</p>

      <section className="legal-section">
        <h2>1. Who we are</h2>
        <p>
          MCP-MD-Sharing is a platform for sharing and versioning Markdown documentation,
          accessible online and from AI coding agents (Claude Code, Cursor, Codex) via the Model
          Context Protocol, at{" "}
          <a href="https://mcp-md-sharing.tkissdev.com">mcp-md-sharing.tkissdev.com</a>. The
          service is operated by <strong>TKissDev</strong> (contact: contact@tkissdev.com).
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Data we collect</h2>
        <p>We only collect data required to operate the service:</p>
        <ul>
          <li>
            <strong>Email address</strong> — used for authentication.
          </li>
          <li>
            <strong>Google data</strong> — if you sign in via Google: the identifier, email
            address, and avatar provided by that service.
          </li>
          <li>
            <strong>Content you add</strong> — organizations, projects, Markdown documents, and
            their version history.
          </li>
          <li>
            <strong>Personal API keys</strong> — stored as a hash (never in plain text), used to
            connect your AI agents.
          </li>
        </ul>
        <p>We do not collect: location, payment data, advertising data, or behavioral tracking.</p>
      </section>

      <section className="legal-section">
        <h2>3. Purpose of processing</h2>
        <ul>
          <li>Authentication and secure access to your account</li>
          <li>Storage and display of your organizations, projects, and documents</li>
          <li>Semantic search across your documents (see section 5 for the OpenAI data flow)</li>
          <li>Secure connection of your AI agents via a personal API key</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>4. Legal basis (GDPR)</h2>
        <p>
          Processing is based on your <strong>consent</strong> (Art. 6.1.a GDPR), given when
          creating your account, and on the <strong>performance of the service contract</strong>{" "}
          (Art. 6.1.b GDPR).
        </p>
      </section>

      <section className="legal-section">
        <h2>5. Storage and hosting</h2>
        <p>
          Data is stored in <strong>Supabase</strong> (PostgreSQL database). The web application is
          hosted on <strong>Vercel</strong>. For semantic search, the content of your documents is
          sent to <strong>OpenAI</strong> to generate search embeddings — this content is only used
          for that request, in line with OpenAI's API policy. These providers are bound by data
          protection agreements (DPA, standard contractual clauses).
        </p>
      </section>

      <section className="legal-section">
        <h2>6. Retention period</h2>
        <p>
          Your data is retained for as long as your account is active. To request deletion of your
          account, contact us — your data will be erased within 30 days.
        </p>
      </section>

      <section className="legal-section">
        <h2>7. Data sharing</h2>
        <p>
          We do not sell or share your data with third parties for commercial purposes. Only
          essential technical providers (Supabase, Vercel, OpenAI) process your data, strictly
          within the scope of providing the service.
        </p>
      </section>

      <section className="legal-section">
        <h2>8. Your rights (GDPR)</h2>
        <p>Under GDPR, you have the following rights:</p>
        <ul>
          <li>
            <strong>Access</strong> — obtain a copy of your data
          </li>
          <li>
            <strong>Rectification</strong> — correct inaccurate data
          </li>
          <li>
            <strong>Erasure</strong> — delete your account and all your data
          </li>
          <li>
            <strong>Portability</strong> — export your data in a readable format
          </li>
          <li>
            <strong>Objection</strong> — object to processing
          </li>
        </ul>
        <p>
          To exercise these rights, contact us at: <a href="mailto:contact@tkissdev.com">contact@tkissdev.com</a>.
          Response time: maximum 30 days.
        </p>
        <p>
          You may also file a complaint with the French data protection authority (<strong>CNIL</strong>
          ):{" "}
          <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noreferrer">
            cnil.fr/fr/plaintes
          </a>
          .
        </p>
      </section>

      <section className="legal-section">
        <h2>9. Cookies and trackers</h2>
        <p>
          MCP-MD-Sharing uses a session cookie required for you to stay signed in. Data is also
          stored locally in your browser (<code>localStorage</code>) only to remember your
          interface preferences (language, sidebar state). No advertising or tracking cookies.
        </p>
      </section>

      <section className="legal-section">
        <h2>10. Changes</h2>
        <p>
          This policy may be updated. In case of a significant change, you will be notified by
          email or via an in-app notification.
        </p>
      </section>

      <section className="legal-section">
        <h2>11. Contact</h2>
        <p>
          For any questions about this policy: <a href="mailto:contact@tkissdev.com">contact@tkissdev.com</a>
        </p>
      </section>
    </>
  );
}
