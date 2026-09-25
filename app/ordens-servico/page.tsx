      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">
                    {selectedOrder.number}
                  </h2>

                  <span
                    className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClass(
                      selectedOrder.status
                    )}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  Ordem de Serviço
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ADICIONADO pb-28 AQUI PARA DAR ESPAÇO NO FUNDO */}
            <div className="space-y-5 p-5 pb-28">

              <div className="grid gap-4 md:grid-cols-2">

                <div className="rounded-xl bg-slate-950 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <User className="h-4 w-4 text-cyan-400" />
                    <h3 className="font-semibold">
                      Cliente
                    </h3>
                  </div>

                  <p className="font-semibold">
                    {selectedOrder.client}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {selectedOrder.city ||
                      "Cidade não informada"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-cyan-400" />
                    <h3 className="font-semibold">
                      Atendimento
                    </h3>
                  </div>

                  <p className="text-sm">
                    Data:{" "}
                    <strong>
                      {formatDate(
                        selectedOrder.date
                      )}
                    </strong>
                  </p>

                  <p className="mt-1 text-sm">
                    Técnico:{" "}
                    <strong>
                      {selectedOrder.technician ||
                        "Não definido"}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-cyan-400" />

                  <h3 className="font-semibold">
                    Equipamento
                  </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Equipamento
                    </p>

                    <p className="mt-1 font-semibold">
                      {selectedOrder.equipment ||
                        "Não informado"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Marca
                    </p>

                    <p className="mt-1 font-semibold">
                      {selectedOrder.equipmentBrand ||
                        "Não informada"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Modelo
                    </p>

                    <p className="mt-1 font-semibold">
                      {selectedOrder.equipmentModel ||
                        "Não informado"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Capacidade
                    </p>

                    <p className="mt-1 font-semibold">
                      {selectedOrder.equipmentCapacity ||
                        "Não informada"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <h3 className="mb-3 font-semibold">
                  Serviço
                </h3>

                <p className="text-sm text-cyan-400">
                  {selectedOrder.serviceType}
                </p>

                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
                  {selectedOrder.description ||
                    "Nenhuma descrição informada."}
                </p>
              </div>

              {selectedOrder.monthlyPlanId && (
                <div
                  className={`rounded-xl border p-4 ${
                    selectedOrder.monthlyPlanCovered
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-red-500/30 bg-red-500/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {selectedOrder.monthlyPlanCovered ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
                    )}

                    <div>
                      <h3 className="font-semibold">
                        Plano Mensal
                      </h3>

                      <p className="mt-1 text-sm">
                        Status:{" "}
                        <strong>
                          {selectedOrder.monthlyPlanStatus}
                        </strong>
                      </p>

                      {selectedOrder.monthlyPlanIncludedService && (
                        <p className="mt-1 text-sm text-slate-400">
                          Serviço incluso:{" "}
                          {selectedOrder.monthlyPlanIncludedService}
                        </p>
                      )}

                      {selectedOrder.monthlyPlanWarning && (
                        <p className="mt-2 font-semibold text-red-400">
                          {selectedOrder.monthlyPlanWarning}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-slate-950 p-4">
                <h3 className="mb-4 font-semibold">
                  Valores
                </h3>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-900 p-4">
                    <p className="text-xs text-slate-500">
                      Serviço
                    </p>

                    <p className="mt-1 text-lg font-bold">
                      {formatCurrency(
                        selectedOrder.serviceValue
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-900 p-4">
                    <p className="text-xs text-slate-500">
                      Materiais
                    </p>

                    <p className="mt-1 text-lg font-bold">
                      {formatCurrency(
                        selectedOrder.materialsValue
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                    <p className="text-xs text-slate-500">
                      Total
                    </p>

                    <p className="mt-1 text-lg font-bold text-cyan-400">
                      {formatCurrency(
                        selectedOrder.value
                      )}
                    </p>
                  </div>
                </div>

                {selectedOrder.materialsDescription && (
                  <div className="mt-4 rounded-xl bg-slate-900 p-4">
                    <p className="text-xs text-slate-500">
                      Materiais
                    </p>

                    <p className="mt-1 text-sm">
                      {selectedOrder.materialsDescription}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-cyan-400" />

                    <div>
                      <p className="font-semibold">
                        Pagamento dos materiais
                      </p>

                      <p
                        className={
                          selectedOrder.materialsPaid
                            ? "text-sm text-emerald-400"
                            : "text-sm text-yellow-400"
                        }
                      >
                        {selectedOrder.materialsPaid
                          ? "Materiais pagos"
                          : "Materiais pendentes"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      toggleMaterialsPayment(
                        selectedOrder
                      )
                    }
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                      selectedOrder.materialsPaid
                        ? "border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                        : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    }`}
                  >
                    {selectedOrder.materialsPaid
                      ? "Marcar como pendente"
                      : "Marcar materiais como pagos"}
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <h3 className="mb-3 font-semibold">
                  Observações
                </h3>

                <p className="whitespace-pre-wrap text-sm text-slate-300">
                  {selectedOrder.notes ||
                    "Nenhuma observação."}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <h3 className="mb-3 font-semibold">
                  Alterar status
                </h3>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "Aberta",
                      "Agendada",
                      "Em andamento",
                      "Concluída",
                      "Cancelada",
                    ] as ServiceOrderStatus[]
                  ).map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        changeStatus(
                          selectedOrder,
                          status
                        )
                      }
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        selectedOrder.status ===
                        status
                          ? statusClass(
                              status
                            )
                          : "border-slate-700 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-slate-800 bg-slate-900 p-5">

              <button
                onClick={() =>
                  printServiceOrder(
                    selectedOrder
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>

              <button
                onClick={() =>
                  sendServiceOrderWhatsApp(
                    selectedOrder
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-emerald-500/20 px-4 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/10"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </button>

              <button
                onClick={() => {
                  setSelectedOrder(null);
                  openEditOrder(
                    selectedOrder
                  );
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-800"
              >
                <Edit className="h-4 w-4" />
                Editar
              </button>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
