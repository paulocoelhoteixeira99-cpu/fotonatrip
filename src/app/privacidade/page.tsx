import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Politica de Privacidade | fotonatrip",
  description:
    "Saiba como a fotonatrip coleta, utiliza e protege seus dados pessoais, incluindo dados biometricos.",
};

export default function PrivacidadePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Politica de{" "}
              <span className="gradient-text">Privacidade</span>
            </h1>
            <p className="text-muted text-sm">
              Ultima atualizacao: 24 de setembro de 2026
            </p>
          </div>

          {/* Content */}
          <div className="space-y-10 text-sm leading-relaxed text-muted">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                1. Introducao
              </h2>
              <p>
                A <strong className="text-foreground">fotonatrip</strong>{" "}
                (&quot;nos&quot;, &quot;nosso&quot; ou &quot;plataforma&quot;) se
                compromete a proteger a privacidade dos seus usuarios. Esta
                Politica de Privacidade descreve como coletamos, utilizamos,
                armazenamos e protegemos seus dados pessoais, em conformidade com
                a Lei Geral de Protecao de Dados (LGPD — Lei n. 13.709/2018).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                2. Dados que coletamos
              </h2>
              <p className="mb-3">Coletamos os seguintes dados pessoais:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Dados de cadastro:</strong>{" "}
                  nome completo, email, senha (criptografada) e, para fotografos,
                  telefone/WhatsApp.
                </li>
                <li>
                  <strong className="text-foreground">
                    Dados biometricos (reconhecimento facial):
                  </strong>{" "}
                  ao utilizar a busca por selfie, processamos sua imagem facial
                  para gerar uma representacao numerica (embedding) que permite
                  identificar suas fotos nos eventos. A selfie em si nao e
                  armazenada — apenas o embedding numerico e mantido
                  temporariamente durante a sessao de busca.
                </li>
                <li>
                  <strong className="text-foreground">Dados de fotos:</strong>{" "}
                  fotos enviadas por fotografos sao processadas para deteccao de
                  rostos. Os embeddings faciais extraidos sao armazenados
                  associados a cada foto para viabilizar a busca.
                </li>
                <li>
                  <strong className="text-foreground">
                    Dados de pagamento:
                  </strong>{" "}
                  as transacoes sao processadas integralmente pelo Mercado Pago.
                  Nao armazenamos dados de cartao de credito ou informacoes
                  bancarias.
                </li>
                <li>
                  <strong className="text-foreground">Dados de uso:</strong>{" "}
                  informacoes sobre navegacao, paginas visitadas e interacoes com
                  a plataforma para melhoria do servico.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                3. Finalidade do tratamento
              </h2>
              <p className="mb-3">Utilizamos seus dados para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Criar e gerenciar sua conta na plataforma;</li>
                <li>
                  Permitir a busca de fotos por reconhecimento facial (mediante
                  seu consentimento);
                </li>
                <li>Processar pagamentos e entregar fotos adquiridas;</li>
                <li>
                  Enviar comunicacoes relacionadas ao servico (confirmacao de
                  compra, atualizacoes de conta);
                </li>
                <li>
                  Garantir a seguranca da plataforma e prevenir fraudes;
                </li>
                <li>Melhorar a experiencia do usuario e o desempenho do servico.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                4. Base legal (LGPD)
              </h2>
              <p className="mb-3">
                O tratamento dos seus dados pessoais se fundamenta nas seguintes
                bases legais:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Consentimento</strong>{" "}
                  (Art. 7, I): para o tratamento de dados biometricos
                  (reconhecimento facial), obtido de forma explicita no momento do
                  cadastro.
                </li>
                <li>
                  <strong className="text-foreground">
                    Execucao de contrato
                  </strong>{" "}
                  (Art. 7, V): para processar compras e fornecer acesso as fotos
                  adquiridas.
                </li>
                <li>
                  <strong className="text-foreground">
                    Interesse legitimo
                  </strong>{" "}
                  (Art. 7, IX): para melhoria do servico e seguranca da
                  plataforma.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                5. Reconhecimento facial e dados biometricos
              </h2>
              <p className="mb-3">
                O reconhecimento facial e uma funcionalidade central da
                fotonatrip. E importante que voce entenda como funciona:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Busca por selfie:</strong>{" "}
                  quando voce tira ou envia uma selfie, ela e processada em tempo
                  real para gerar um vetor numerico (embedding). Este vetor e
                  comparado com os vetores das fotos do evento. A imagem da selfie
                  nao e salva.
                </li>
                <li>
                  <strong className="text-foreground">Fotos de eventos:</strong>{" "}
                  as fotos enviadas por fotografos passam por deteccao automatica
                  de rostos. Os embeddings extraidos sao armazenados enquanto o
                  evento estiver ativo (ate 3 meses) e sao excluidos junto com as
                  fotos nao vendidas.
                </li>
                <li>
                  <strong className="text-foreground">Finalidade unica:</strong>{" "}
                  os dados biometricos sao usados exclusivamente para a busca de
                  fotos. Nao utilizamos esses dados para identificacao pessoal,
                  vigilancia, publicidade ou qualquer outra finalidade.
                </li>
                <li>
                  <strong className="text-foreground">
                    Nao compartilhamento:
                  </strong>{" "}
                  dados biometricos nunca sao compartilhados com terceiros.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                6. Compartilhamento de dados
              </h2>
              <p className="mb-3">
                Seus dados pessoais podem ser compartilhados apenas com:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Mercado Pago:</strong> para
                  processamento de pagamentos, conforme a politica de privacidade
                  do Mercado Pago.
                </li>
                <li>
                  <strong className="text-foreground">
                    Provedores de infraestrutura:
                  </strong>{" "}
                  utilizamos Supabase (banco de dados e autenticacao), DigitalOcean
                  (armazenamento de fotos e processamento) e Vercel (hospedagem do
                  site). Esses provedores atuam como operadores sob nossas
                  instrucoes.
                </li>
              </ul>
              <p className="mt-3">
                Nao vendemos, alugamos ou comercializamos seus dados pessoais.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                7. Retencao de dados
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Conta:</strong> seus dados
                  de cadastro sao mantidos enquanto sua conta estiver ativa.
                </li>
                <li>
                  <strong className="text-foreground">Fotos e embeddings:</strong>{" "}
                  fotos de eventos e seus embeddings faciais sao mantidos por ate 3
                  meses apos a criacao do evento. Fotos vendidas ficam disponiveis
                  indefinidamente para o comprador.
                </li>
                <li>
                  <strong className="text-foreground">Pagamentos:</strong>{" "}
                  registros de transacoes sao mantidos pelo prazo legal exigido
                  para fins fiscais e contabeis.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                8. Seus direitos (LGPD)
              </h2>
              <p className="mb-3">
                Conforme a LGPD, voce tem os seguintes direitos sobre seus dados:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Confirmacao da existencia de tratamento de dados;</li>
                <li>Acesso aos seus dados pessoais;</li>
                <li>Correcao de dados incompletos ou desatualizados;</li>
                <li>
                  Anonimizacao, bloqueio ou eliminacao de dados desnecessarios;
                </li>
                <li>Portabilidade dos dados;</li>
                <li>
                  Eliminacao dos dados tratados com base no consentimento;
                </li>
                <li>
                  Revogacao do consentimento a qualquer momento;
                </li>
                <li>
                  Informacao sobre o compartilhamento de dados.
                </li>
              </ul>
              <p className="mt-3">
                Para exercer qualquer desses direitos, entre em contato pelo email{" "}
                <a
                  href="mailto:fotonatrip2026@gmail.com"
                  className="text-primary hover:text-primary-light transition-colors"
                >
                  fotonatrip2026@gmail.com
                </a>
                . Responderemos em ate 15 dias uteis.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                9. Seguranca
              </h2>
              <p>
                Adotamos medidas tecnicas e organizacionais para proteger seus
                dados, incluindo: criptografia em transito (HTTPS/TLS),
                autenticacao segura, controle de acesso restrito, firewall,
                protecao contra ataques de forca bruta e monitoramento continuo.
                Nenhum sistema e 100% seguro, mas nos esformamos para manter o
                mais alto nivel de protecao possivel.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                10. Alteracoes nesta politica
              </h2>
              <p>
                Podemos atualizar esta Politica de Privacidade periodicamente. Em
                caso de alteracoes significativas, notificaremos voce por email ou
                por aviso na plataforma. A data da ultima atualizacao sera sempre
                indicada no topo desta pagina.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                11. Contato
              </h2>
              <p>
                Para duvidas, solicitacoes ou reclamacoes sobre esta politica ou
                sobre o tratamento dos seus dados, entre em contato:
              </p>
              <div className="mt-3 glass rounded-xl p-4 space-y-1">
                <p>
                  <strong className="text-foreground">fotonatrip</strong>
                </p>
                <p>
                  Email:{" "}
                  <a
                    href="mailto:fotonatrip2026@gmail.com"
                    className="text-primary hover:text-primary-light transition-colors"
                  >
                    fotonatrip2026@gmail.com
                  </a>
                </p>
                <p>
                  Instagram:{" "}
                  <a
                    href="https://instagram.com/fotonatrip_oficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-light transition-colors"
                  >
                    @fotonatrip_oficial
                  </a>
                </p>
              </div>
            </section>
          </div>

          {/* Links */}
          <div className="mt-12 flex justify-center gap-6 text-sm text-muted">
            <Link
              href="/ajuda"
              className="hover:text-foreground transition-colors"
            >
              Central de Ajuda
            </Link>
            <Link
              href="/termos"
              className="hover:text-foreground transition-colors"
            >
              Termos de Uso
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
