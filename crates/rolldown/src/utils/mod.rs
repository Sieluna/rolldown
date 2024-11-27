use oxc::ast::VisitMut;
use rolldown_common::NormalModule;
use rolldown_ecmascript::EcmaAst;
use rolldown_ecmascript_utils::{AstSnippet, TakeIn};

use super::module_finalizers::scope_hoisting::{
  ScopeHoistingFinalizer, ScopeHoistingFinalizerContext,
};
pub mod apply_inner_plugins;
pub mod augment_chunk_hash;
pub mod call_expression_ext;
pub mod chunk;
pub mod ecma_visitors;
pub mod extract_meaningful_input_name_from_path;
pub mod load_source;
pub mod make_ast_symbol_and_scope;
pub mod normalize_options;
pub mod parse_to_ecma_ast;
pub mod pre_process_ecma_ast;
pub mod renamer;
pub mod render_chunks;
pub mod render_ecma_module;
pub mod resolve_id;
pub mod transform_source;
pub mod tweak_ast_for_scanning;
pub mod uuid;

#[tracing::instrument(level = "trace", skip_all)]
pub fn finalize_normal_module(
  module: &NormalModule,
  ctx: ScopeHoistingFinalizerContext<'_>,
  ast: &mut EcmaAst,
) {
  ast.program.with_mut(|fields| {
    let (oxc_program, alloc) = (fields.program, fields.allocator);
    let mut finalizer = ScopeHoistingFinalizer {
      alloc,
      ctx,
      scope: &module.scope,
      snippet: AstSnippet::new(alloc),
      comments: oxc_program.comments.take_in(alloc),
      contains_reference_to_namespace_ref_of_this_module: false,
    };
    finalizer.visit_program(oxc_program);
    oxc_program.comments = finalizer.comments.take_in(alloc);
  });
}
