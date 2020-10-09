import React, { useRef } from 'react'
import { styled } from '@material-ui/core/styles'
import dynamic from 'next/dynamic'
import { Input } from '@material-ui/core'
import { useWeb3React } from '@web3-react/core'
import {
  gql,
  useMutation
} from '@apollo/client'
import { PLACEHOLDER_FT_IMG } from '../../constants'
// import {
//   modules,
//   formats
// } from './EditorToolbar'

const EditorToolbar = dynamic(
  import('./EditorToolbar'), { ssr: false, loading: () => <p>Loading ...</p> }
)

// const modules = dynamic(
//   import('./EditorToolbar').then((mod) => mod.modules), { ssr: false, loading: () => <p>Loading ...</p>}
// )

const formats = dynamic(
  import('./EditorToolbar').then((mod) => mod.formats), { ssr: false, loading: () => <p>Loading ...</p>}
)

const ReactQuill = dynamic(
  import('react-quill'), { ssr: false, loading: () => <p>Loading ...</p> }
)

const FormTextField = styled(Input)({
  width: '100%',
  'border-radius': '4px',
  margin: '1vh 0'
})

const TitleField = styled(FormTextField)({
  'font-size': '40px',
  'font-weight': 'bold'
})

const SubtitleField = styled(FormTextField)({
  'font-size': '20px',
  'font-weight': 'bolder'
})

const TitleContainer = styled('div')({
  padding: '7vh 0 0 0',
  'text-align': 'center'
})

const PostContent = styled('div')({
  'margin-top': '15px'
})

const Editor = styled(ReactQuill)({
  'margin-left': '-12px',
  'margin-right': '-12px'
})

const ImageContainer = styled('div')({
  position: 'relative',
  color: '#a6a6a6',
  'text-align': 'center'
})

const CenteredText = styled('div')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  'font-family': 'Spectral, serif',
  'font-style': 'italic'
})

const FeaturedImage = styled('img')({
  width: '100%',
  height: 'auto',
  maxHeight: '200px',
  marginTop: '10px',
  'object-fit': 'cover',
  'background-color': '#c4c4c4',
  '&:hover': {
    'background-color': '#000',
    opacity: 0.7
  }
})

const UPLOAD_IMAGE = gql`
  mutation uploadImage($image: Image!, $address: String!) {
    uploadImage(image: $image, address: $address) {
      txId
    }
  }
`

const ContentEditor = ({ title, subtitle, postText, featuredImg, setTitle, setSubtitle, setPostText, setFeaturedImage, isEditing }) => {
  const { account } = useWeb3React()
  const editorRef = useRef(undefined)
  const [uploadImageToAR] = useMutation(UPLOAD_IMAGE)

  if (editorRef.current?.getEditor && !window.editor) {
    window.editor = editorRef.current.getEditor()
  }

  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        let encoded = reader.result.toString().replace(/^data:(.*,)?/, '')
        if ((encoded.length % 4) > 0) {
          encoded += '='.repeat(4 - (encoded.length % 4))
        }
        resolve(encoded)
      }
      reader.onerror = error => reject(error)
    })
  }

  const imageUpload = async (photoFile) => {
    const rawImage = await getBase64(photoFile)

    const image = {
      data: rawImage,
      mimeType: photoFile.type
    }
    const options = {
      variables: {
        image: image,
        address: account
      }
    }
    const res = await uploadImageToAR(options)

    const featuredImgSrc = `https://arweave.dev/${res.data.uploadImage.txId}`
    return featuredImgSrc
  }

  const handleImage = (isFeaturedImage) => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()
    input.onchange = async () => {
      const file = input.files[0]
      const imgSrc = await imageUpload(file)
      restoreFocus()
      const range = window.editor.getSelection(true)

      if (isFeaturedImage) setFeaturedImage(imgSrc)
      else window.editor.insertEmbed(range?.index || 0, 'image', imgSrc)
    }
  }

  const restoreFocus = () => {
    window.editor.focus()
    if (window?.getSelection?.focusNode?.parentElement) {
      const selectionEl = window.getSelection().focusNode.parentElement
      selectionEl.scrollIntoView({ block: 'center', inline: 'center' })
    }
  }

  const getYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)

    return (match && match[2].length === 11)
      ? match[2]
      : null
  }

  const handleEditorChange = async (value, delta, source, editor) => {
    if (source === 'user' && window.editor) {
      restoreFocus()
      // auto replace twitter
      let matches = editor.getText().match(/(^|[^'"])(https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)[?]?(s=\d+)?)/)
      if (matches != null && window.editor) {
        const range = window.editor.getSelection()
        const index = range?.index || 0
        window.editor.deleteText(index, matches[0].length)
        window.editor.insertEmbed(index, 'twitter', { url: matches[0] }, 'Silent')
        window.editor.insertText(index + 1, '\u00a0', 'Silent')
        return
      }
      // auto replace youtube
      matches = editor.getText().match(/(http:|https:)?(\/\/)?(www\.)?(youtube.com|youtu.be)\/(watch|embed)?(\?v=|\/)?(\S+)?/)
      if (matches != null && window.editor) {
        const range = window.editor.getSelection()
        const index = range?.index || 0
        window.editor.deleteText(index, matches[0].length)
        const id = getYoutubeId(matches[0])
        if (!id) return
        const url = 'https://www.youtube.com/embed/' + id
        window.editor.insertEmbed(index, 'video', url, 'Silent')
        return
      }
    }
    setPostText(value)
  }

  // modules.toolbar.handlers.image = () => handleImage(false)

  return (
    <>
      <TitleContainer>
        { isEditing &&
          <h3>
            Edit Post
          </h3>
        }
        <TitleField
          onChange={(event) => setTitle(event.target.value)}
          value={title}
          placeholder='Title'
          disableUnderline={true}
        />
        <SubtitleField
          onChange={(event) => setSubtitle(event.target.value)}
          value={subtitle}
          placeholder='Subtitle'
          disableUnderline={true}
        />
        <ImageContainer
          onClick={() => handleImage(true)}
        >
          { featuredImg ? (
            <FeaturedImage src={featuredImg} alt='Placeholder ft img' />
          ) : (
            <>
              <FeaturedImage src={PLACEHOLDER_FT_IMG} alt='Placeholder ft img' />
              <CenteredText>Add a featured image to your post</CenteredText>
            </>
          )
          }
        </ImageContainer>
      </TitleContainer>
      <PostContent>
        <EditorToolbar />
        <Editor
          placeholder="Begin writing your post"
          theme='bubble'
          ref={editorRef}
          value={postText}
          onChange={handleEditorChange}
          // modules={modules}
          formats={formats}
        />
      </PostContent>
    </>
  )
}

export default ContentEditor
