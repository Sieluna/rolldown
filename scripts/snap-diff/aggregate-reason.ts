import remarkParse from 'remark-parse'
import { unified } from 'unified'
import fg from 'fast-glob'
import * as path from 'node:path'
import * as fs from 'node:fs'

export function extractReason(source: string) {
  const processor = unified().use(remarkParse)

  const parseTree = processor.parse(source)
  const tree: any = processor.runSync(parseTree)

  let i = 0
  let inReason = false
  let ret = []

  while (i < tree.children.length) {
    let child = tree.children[i]
    if (inReason && child.type === 'list') {
      let childList = child.children
      for (let j = 0; j < child.children.length; j++) {
        let listItem = childList[j]
        let position = listItem.children[0].position
        let listContent = source.slice(
          position.start.offset,
          position.end.offset,
        )
        ret.push(listContent)
      }
    }
    if (child.type === 'heading' && child.depth === 1) {
      let content = source.slice(
        child.position.start.offset,
        child.position.end.offset,
      )
      if (content.trim().slice(1).trim() === 'Reason') {
        inReason = true
      } else {
        inReason = false
      }
    }
    i++
  }
  return ret
}

const esbuildTestDir = path.join(
  import.meta.dirname,
  '../../crates/rolldown/tests/esbuild',
)

const workspaceDir = path.join(import.meta.dirname, '../..')
export type AggregateReasonEntries = [string, string[]][]
export function aggregateReason(): AggregateReasonEntries {
  const entries = fg.globSync([`${esbuildTestDir}/**/diff.md`], { dot: false })
  // a map for each directory to its diff reasons
  let reasonMap: Record<string, string[]> = {}
  let reverseMap: Record<string, string[]> = {}
  for (let entry of entries) {
    let content = fs.readFileSync(entry, 'utf-8')
    let reasons = extractReason(content)
    let dirname = path.relative(workspaceDir, path.dirname(entry))

    reasonMap[dirname] = reasons
    for (let reason of reasons) {
      if (!reverseMap[reason]) {
        reverseMap[reason] = []
      }
      reverseMap[reason].push(dirname)
    }
  }
  let reverseMapEntries = Object.entries(reverseMap)
  reverseMapEntries.sort((a, b) => {
    return b[1].length - a[1].length
  })
  return reverseMapEntries
}
