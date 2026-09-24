import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { FileText } from "lucide-react";

export const metadata = {
  title: "Termos de Uso | fotonatrip",
  description:
    "Termos e condicoes de uso da plataforma fotonatrip.",
};

export default function TermosPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Termos de <span className="gradient-text">Uso</span>
            </h1>
            <p className="text-muted text-sm">
              Ultima atualizacao: 24 de setembro de 2026
            </p>
          </div>

          {/* Content */}
          <div className="space-y-10 text-sm leading-relaxed text-muted">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                1. Aceitacao dos termos
              </h2>
              <p>
                Ao acessar ou utilizar a plataforma{" "}
                <strong className="text-foreground">fotonatrip</strong>{" "}
                (&quot;plataforma&quot;), disponivel em{" "}
                <strong className="text-foreground">
                  www.fotonatrip.com.br
                </strong>
                , voce concorda com estes Termos de Uso. Caso nao concorde, nao
                utilize a plataforma. O uso continuado apos alteracoes nestes
                termos constitui aceitacao das modificacoes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                2. Descricao do servico
              </h2>
              <p>
                A fotonatrip e uma plataforma que conecta fotografos profissionais
                a participantes de eventos e viagens. Os fotografos enviam fotos
                dos eventos e os participantes podem encontrar suas fotos
                utilizando tecnologia de reconhecimento facial, adquirindo-as em
                alta resolucao.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                3. Cadastro e conta
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Voce deve fornecer informacoes verdadeiras e completas ao se
                  cadastrar.
                </li>
                <li>
                  Voce e responsavel por manter a confidencialidade da sua senha e
                  por todas as atividades realizadas na sua conta.
                </li>
                <li>
                  A plataforma se reserva o direito de suspender ou encerrar
                  contas que violem estes termos.
                </li>
                <li>
                  Voce deve ter pelo menos 18 anos para criar uma conta. Menores de
                  18 anos podem utilizar a plataforma sob supervisao de um
                  responsavel legal.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                4. Uso da plataforma — Clientes
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Voce pode buscar fotos utilizando reconhecimento facial,
                  mediante consentimento previo.
                </li>
                <li>
                  Fotos visualizadas na plataforma contem marca d&apos;agua e sao
                  de baixa resolucao. A versao em alta resolucao e liberada
                  somente apos o pagamento.
                </li>
                <li>
                  As fotos adquiridas sao para uso pessoal. E proibida a
                  redistribuicao, revenda ou uso comercial sem autorizacao do
                  fotografo.
                </li>
                <li>
                  Apos a compra, as fotos ficam disponiveis para download
                  indefinidamente na area &quot;Minhas compras&quot;.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                5. Uso da plataforma — Fotografos
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Voce declara ser o autor ou ter autorizacao para comercializar
                  todas as fotos enviadas a plataforma.
                </li>
                <li>
                  Voce e responsavel pelo conteudo das fotos enviadas. Fotos que
                  violem leis, contenham conteudo ilegal, ofensivo ou que infrinjam
                  direitos de terceiros serao removidas e podera resultar no
                  encerramento da conta.
                </li>
                <li>
                  Voce define o preco das fotos e os descontos de pacote para cada
                  evento.
                </li>
                <li>
                  Eventos e fotos nao vendidas sao removidos automaticamente apos
                  3 meses da criacao do evento.
                </li>
                <li>
                  Ao enviar fotos, voce autoriza a plataforma a exibi-las com
                  marca d&apos;agua para fins de visualizacao e busca por
                  reconhecimento facial.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                6. Pagamentos e comissoes
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Os pagamentos sao processados pelo Mercado Pago. A fotonatrip
                  nao armazena dados de cartao de credito.
                </li>
                <li>
                  A plataforma retém uma comissao de 7% sobre cada venda. O
                  fotografo recebe 93% do valor diretamente via Mercado Pago.
                </li>
                <li>
                  Os precos exibidos sao em Reais (BRL) e incluem todos os
                  impostos aplicaveis.
                </li>
                <li>
                  Pagamentos via Pix sao confirmados automaticamente. Pagamentos
                  via cartao sao processados em tempo real.
                </li>
                <li>
                  Em caso de erro no processamento, o cliente pode solicitar
                  suporte pelo email de contato.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                7. Propriedade intelectual
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Os direitos autorais das fotos pertencem aos respectivos
                  fotografos.
                </li>
                <li>
                  A compra de uma foto concede ao cliente uma licenca pessoal, nao
                  exclusiva e intransferivel de uso.
                </li>
                <li>
                  A marca, o logo e o conteudo da plataforma fotonatrip sao de
                  propriedade da fotonatrip e protegidos por lei.
                </li>
                <li>
                  E proibido copiar, reproduzir ou distribuir qualquer conteudo da
                  plataforma sem autorizacao previa.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                8. Reconhecimento facial
              </h2>
              <p>
                A plataforma utiliza tecnologia de reconhecimento facial
                exclusivamente para permitir que usuarios encontrem suas fotos em
                eventos. Ao utilizar esta funcionalidade, voce consente com o
                processamento da sua imagem facial conforme descrito na nossa{" "}
                <Link
                  href="/privacidade"
                  className="text-primary hover:text-primary-light transition-colors"
                >
                  Politica de Privacidade
                </Link>
                . Voce pode revogar este consentimento a qualquer momento
                entrando em contato conosco.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                9. Conduta do usuario
              </h2>
              <p className="mb-3">Ao utilizar a plataforma, voce se compromete a nao:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Utilizar a plataforma para fins ilegais ou nao autorizados;
                </li>
                <li>
                  Tentar acessar contas, dados ou areas restritas de outros
                  usuarios;
                </li>
                <li>
                  Fazer engenharia reversa, descompilar ou tentar extrair o
                  codigo-fonte da plataforma;
                </li>
                <li>
                  Utilizar bots, scrapers ou outros meios automatizados para
                  acessar a plataforma;
                </li>
                <li>
                  Enviar conteudo malicioso, virus ou qualquer material que possa
                  danificar a plataforma.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                10. Limitacao de responsabilidade
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  A fotonatrip atua como intermediaria entre fotografos e
                  clientes. Nao somos responsaveis pela qualidade, precisao ou
                  conteudo das fotos enviadas pelos fotografos.
                </li>
                <li>
                  Nao garantimos que a plataforma estara disponivel
                  ininterruptamente ou livre de erros.
                </li>
                <li>
                  A precisao do reconhecimento facial pode variar dependendo de
                  condicoes como iluminacao, angulo e qualidade da imagem.
                </li>
                <li>
                  Em nenhuma hipotese nossa responsabilidade total excedara o
                  valor pago pelo usuario nos ultimos 12 meses.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                11. Rescisao
              </h2>
              <p>
                Voce pode encerrar sua conta a qualquer momento entrando em
                contato pelo email{" "}
                <a
                  href="mailto:fotonatrip2026@gmail.com"
                  className="text-primary hover:text-primary-light transition-colors"
                >
                  fotonatrip2026@gmail.com
                </a>
                . A plataforma se reserva o direito de suspender ou encerrar contas
                que violem estes termos, sem aviso previo. Apos o encerramento, as
                fotos compradas continuam disponiveis para download.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                12. Alteracoes nos termos
              </h2>
              <p>
                Podemos alterar estes Termos de Uso a qualquer momento. Alteracoes
                significativas serao comunicadas por email ou aviso na plataforma.
                O uso continuado apos a notificacao constitui aceitacao dos novos
                termos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                13. Legislacao aplicavel
              </h2>
              <p>
                Estes Termos de Uso sao regidos pelas leis da Republica
                Federativa do Brasil. Qualquer disputa sera submetida ao foro da
                comarca do domicilio do usuario, conforme o Codigo de Defesa do
                Consumidor.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                14. Contato
              </h2>
              <p>
                Para duvidas sobre estes termos, entre em contato:
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
              href="/privacidade"
              className="hover:text-foreground transition-colors"
            >
              Politica de Privacidade
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
